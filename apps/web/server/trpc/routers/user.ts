import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { TRPCError } from '@trpc/server'
import { createClient } from '@supabase/supabase-js'
import { tenantProcedure, authorizedProcedure, publicProcedure, router } from '../init'
import { ASSIGNABLE_ROLES, ROLE_LABELS, type UserRole } from '@/lib/rbac'
import { sendInviteEmail } from '@/lib/resend'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const userRouter = router({
  // List all users in current tenant
  list: authorizedProcedure('MANAGE_USERS').query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('tenant_users')
      .select('id, user_id, role, is_active, created_at, users(name, email, avatar_url)')
      .eq('tenant_id', ctx.tenantId)
      .order('created_at')

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  // Get current user's profile within the tenant
  me: tenantProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('tenant_users')
      .select('id, user_id, role, is_active, created_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('user_id', ctx.user.id)
      .single()

    if (error) throw new TRPCError({ code: 'NOT_FOUND' })
    return { ...data, email: ctx.user.email, userRole: ctx.userRole }
  }),

  // List pending (unaccepted, unexpired) invites for the current tenant
  listInvites: authorizedProcedure('MANAGE_USERS').query(async ({ ctx }) => {
    const admin = serviceClient()
    const { data, error } = await admin
      .from('tenant_invites')
      .select('id, email, role, created_at, expires_at')
      .eq('tenant_id', ctx.tenantId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  // Invite a new user to the tenant. Sends the email directly via Resend --
  // does NOT use Supabase Auth's signInWithOtp/admin.inviteUserByEmail,
  // both of which route through Supabase's own mailer regardless of
  // anything configurable from application code (confirmed live:
  // "email rate limit exceeded" on the default tier).
  invite: authorizedProcedure('MANAGE_USERS')
    .input(z.object({
      email: z.string().email(),
      role: z.enum(ASSIGNABLE_ROLES as [string, ...string[]]),
    }))
    .mutation(async ({ ctx, input }) => {
      const admin = serviceClient()

      const { data: tenant } = await ctx.supabase
        .from('tenants')
        .select('name')
        .eq('id', ctx.tenantId)
        .single()

      const { data: inviter } = await ctx.supabase
        .from('users')
        .select('name')
        .eq('id', ctx.user.id)
        .single()

      const token = randomBytes(32).toString('hex')

      const { error: insertErr } = await admin
        .from('tenant_invites')
        .insert({
          tenant_id: ctx.tenantId,
          email: input.email,
          role: input.role,
          token,
          invited_by: ctx.user.id,
        })
      if (insertErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertErr.message })

      const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://aoc-erp.vercel.app'}/invite/${token}`

      try {
        await sendInviteEmail({
          to: input.email,
          tenantName: (tenant as any)?.name ?? 'AOC ERP',
          inviterName: (inviter as any)?.name ?? 'A teammate',
          role: ROLE_LABELS[input.role as UserRole] ?? input.role,
          acceptUrl,
        })
      } catch (err) {
        // Invite row is already saved -- the link still works even if the
        // notification email failed to send. Surface the failure so the
        // admin knows to share the link manually.
        const msg = err instanceof Error ? err.message : 'Failed to send invite email'
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Invite created, but the email failed to send: ${msg}` })
      }

      return { ok: true }
    }),

  // Revoke a pending invite
  revokeInvite: authorizedProcedure('MANAGE_USERS')
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const admin = serviceClient()
      const { error } = await admin
        .from('tenant_invites')
        .delete()
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // Public: look up an invite by token (for the accept-invite page, before
  // the invitee is authenticated).
  getInvite: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const admin = serviceClient()
      const { data, error } = await admin
        .from('tenant_invites')
        .select('email, role, expires_at, accepted_at, tenants(name)')
        .eq('token', input)
        .single()
      if (error || !data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invite not found' })
      if (data.accepted_at) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This invite has already been used' })
      if (new Date(data.expires_at) < new Date()) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This invite has expired' })
      return {
        email: data.email,
        role: ROLE_LABELS[data.role as UserRole] ?? data.role,
        tenantName: (data.tenants as any)?.name ?? 'AOC ERP',
      }
    }),

  // Public: accept an invite -- creates the auth user (or reuses an
  // existing one with the same email), adds them to the tenant, marks the
  // invite used.
  acceptInvite: publicProcedure
    .input(z.object({
      token: z.string(),
      password: z.string().min(8),
      name: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const admin = serviceClient()

      const { data: invite, error: inviteErr } = await admin
        .from('tenant_invites')
        .select('*')
        .eq('token', input.token)
        .single()
      if (inviteErr || !invite) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invite not found' })
      if (invite.accepted_at) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This invite has already been used' })
      if (new Date(invite.expires_at) < new Date()) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This invite has expired' })

      // Reuse an existing auth user with this email if one exists, else create one.
      const { data: existingUsers } = await admin.auth.admin.listUsers()
      let userId = existingUsers.users.find(u => u.email?.toLowerCase() === invite.email.toLowerCase())?.id

      if (!userId) {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: invite.email,
          password: input.password,
          email_confirm: true,
        })
        if (createErr || !created.user) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: createErr?.message ?? 'Failed to create account' })
        userId = created.user.id
      }

      // users must exist before tenant_users -- tenant_users.user_id has a
      // foreign key to public.users.id (not auth.users.id).
      const { error: uErr } = await admin
        .from('users')
        .upsert({ id: userId, tenant_id: invite.tenant_id, name: input.name, email: invite.email, role: invite.role, is_active: true }, { onConflict: 'id' })
      if (uErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: uErr.message })

      const { error: tuErr } = await admin
        .from('tenant_users')
        .upsert({ tenant_id: invite.tenant_id, user_id: userId, role: invite.role, is_active: true }, { onConflict: 'tenant_id,user_id' })
      if (tuErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: tuErr.message })

      await admin.from('tenant_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

      return { ok: true, email: invite.email }
    }),

  // Update a user's role
  updateRole: authorizedProcedure('MANAGE_USERS')
    .input(z.object({
      userId: z.string().uuid(),
      role: z.enum(ASSIGNABLE_ROLES as [string, ...string[]]),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('tenant_users')
        .update({ role: input.role })
        .eq('tenant_id', ctx.tenantId)
        .eq('user_id', input.userId)
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  // Deactivate a user
  deactivate: authorizedProcedure('MANAGE_USERS')
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Cannot deactivate yourself
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot deactivate yourself' })
      }

      const { error } = await ctx.supabase
        .from('tenant_users')
        .update({ is_active: false })
        .eq('tenant_id', ctx.tenantId)
        .eq('user_id', input.userId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),
})
