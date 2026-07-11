import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, tenantProcedure } from '../init'

export const qcRouter = router({
  listChecks: tenantProcedure
    .input(z.object({
      status: z.enum(['pending', 'passed', 'failed']).optional(),
      limit: z.number().int().max(200).default(100),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('qc_checks')
        .select('*, work_orders(number, clients(name))')
        .eq('tenant_id', ctx.tenantId)
        .order('check_name')
        .limit(input?.limit ?? 100)
      if (input?.status) query = query.eq('status', input.status)
      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  getChecks: tenantProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('qc_checks')
        .select('*')
        .eq('wo_id', input)
        .eq('tenant_id', ctx.tenantId)
        .order('check_name')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  upsertChecks: tenantProcedure
    .input(z.object({
      wo_id: z.string().uuid(),
      checks: z.array(z.object({
        check_name: z.string().min(1).max(200),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const rows = input.checks.map(c => ({
        wo_id: input.wo_id,
        tenant_id: ctx.tenantId,
        check_name: c.check_name,
        status: 'pending' as const,
      }))
      const { error } = await ctx.supabase.from('qc_checks').insert(rows)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  updateCheck: tenantProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['pending', 'passed', 'failed']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const patch: Record<string, unknown> = {
        status: input.status,
        checked_by: ctx.user.id,
        checked_at: new Date().toISOString(),
      }
      if (input.notes !== undefined) patch.notes = input.notes

      const { error } = await ctx.supabase
        .from('qc_checks')
        .update(patch)
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  deleteCheck: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('qc_checks')
        .delete()
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
