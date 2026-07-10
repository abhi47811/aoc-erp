import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, tenantProcedure } from '../init'

const WOItemInput = z.object({
  description: z.string().min(1),
  glass_type: z.string().optional(),
  thickness_mm: z.number().optional(),
  width_mm: z.number().optional(),
  height_mm: z.number().optional(),
  qty: z.number().positive().default(1),
  bom_id: z.string().uuid().optional(),
  sort_order: z.number().int().optional(),
})

const WO_STATUSES = ['draft','cutting','grinding','tempering','laminating','assembly','qc','dispatch','delivered','cancelled'] as const

export const workOrderRouter = router({
  list: tenantProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('work_orders')
        .select('*, clients(name), projects(name)')
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
      if (input?.status) q = q.eq('status', input.status)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  get: tenantProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('work_orders')
        .select('*, clients(name), projects(name), work_order_items(*), qc_checks(*), deliveries(*)')
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
        .single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: error.message })
      return data
    }),

  create: tenantProcedure
    .input(z.object({
      number: z.string().min(1).max(50),
      project_id: z.string().uuid().optional(),
      client_id: z.string().uuid().optional(),
      invoice_id: z.string().uuid().optional(),
      due_date: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(WOItemInput).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { items, ...header } = input
      const { data: wo, error: woErr } = await ctx.supabase
        .from('work_orders')
        .insert({
          ...header,
          tenant_id: ctx.tenantId,
          created_by: ctx.user.id,
        })
        .select()
        .single()
      if (woErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: woErr.message })

      if (items && items.length > 0) {
        const rows = items.map((it, i) => ({
          ...it,
          wo_id: wo.id,
          tenant_id: ctx.tenantId,
          sort_order: it.sort_order ?? i,
        }))
        const { error: itemErr } = await ctx.supabase.from('work_order_items').insert(rows)
        if (itemErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: itemErr.message })
      }
      return wo
    }),

  update: tenantProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        number: z.string().min(1).max(50).optional(),
        project_id: z.string().uuid().optional(),
        client_id: z.string().uuid().optional(),
        invoice_id: z.string().uuid().optional(),
        due_date: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(WOItemInput).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const { items, ...rest } = input.data
      const patch: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() }

      if (items) {
        await ctx.supabase.from('work_order_items').delete().eq('wo_id', input.id).eq('tenant_id', ctx.tenantId)
        if (items.length > 0) {
          const rows = items.map((it, i) => ({
            ...it,
            wo_id: input.id,
            tenant_id: ctx.tenantId,
            sort_order: it.sort_order ?? i,
          }))
          await ctx.supabase.from('work_order_items').insert(rows)
        }
      }

      const { error } = await ctx.supabase
        .from('work_orders')
        .update(patch)
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  updateStatus: tenantProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(WO_STATUSES),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('work_orders')
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  delete: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('work_orders')
        .delete()
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
