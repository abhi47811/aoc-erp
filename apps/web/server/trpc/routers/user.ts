import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { tenantProcedure, authorizedProcedure, router } from '../init'
import { ASSIGNABLE_ROLES } from '@/lib/rbac'

export const userRouter = router({
  // List all users in current tenant
  list: authorizedProcedure('MANAGE_USERS').query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('tenant_users')
      .select('id, user_id, role, is_active, created_at')
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

  // Invite a new user to the tenant (sends magic link via Supabase Auth)
  invite: authorizedProcedure('MANAGE_USERS')
    .input(z.object({
      email: z.string().email(),
      role: z.enum(ASSIGNABLE_ROLES as [string, ...string[]]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists in this tenant by email
      const { data: existing } = await ctx.supabase.auth.admin?.listUsers?.()
      // Use Supabase Auth to invite the user
      const { data, error } = await ctx.supabase.auth.signInWithOtp({
        email: input.email,
        options: {
          shouldCreateUser: true,
          data: {
            invited_by_tenant: ctx.tenantId,
            invited_role: input.role,
          },
        },
      })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
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
