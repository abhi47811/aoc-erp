import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, tenantProcedure } from '../init'

export const notificationsRouter = router({
  list: tenantProcedure
    .input(z.object({
      unread_only: z.boolean().default(false),
      limit: z.number().int().max(100).default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .or(`user_id.eq.${ctx.user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(input?.limit ?? 50)
      if (input?.unread_only) query = query.is('read_at', null)
      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  unreadCount: tenantProcedure.query(async ({ ctx }) => {
    const { count, error } = await ctx.supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenantId)
      .or(`user_id.eq.${ctx.user.id},user_id.is.null`)
      .is('read_at', null)
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { count: count ?? 0 }
  }),

  markRead: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { id: input }
    }),

  markAllRead: tenantProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('tenant_id', ctx.tenantId)
      .or(`user_id.eq.${ctx.user.id},user_id.is.null`)
      .is('read_at', null)
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { ok: true }
  }),

  create: tenantProcedure
    .input(z.object({
      title: z.string().min(1),
      body: z.string().optional(),
      type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
      entity_type: z.string().optional(),
      entity_id: z.string().uuid().optional(),
      user_id: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('notifications')
        .insert({ ...input, tenant_id: ctx.tenantId })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  delete: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('notifications')
        .delete()
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { id: input }
    }),
})
