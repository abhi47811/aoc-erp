import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, tenantProcedure, authorizedProcedure } from '../init'

export const bomRouter = router({
  list: tenantProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('bom_templates')
        .select('*, bom_items(*, inventory_items(name, unit))')
        .eq('tenant_id', ctx.tenantId)
        .order('name')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  get: tenantProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('bom_templates')
        .select('*, bom_items(*, inventory_items(name, unit, unit_cost))')
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
        .single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: error.message })
      return data
    }),

  create: authorizedProcedure('MANAGE_PRODUCTION')
    .input(z.object({
      name: z.string().min(1).max(200),
      glass_type: z.string().optional(),
      thickness_mm: z.number().optional(),
      notes: z.string().optional(),
      items: z.array(z.object({
        item_id: z.string().uuid(),
        qty_per_sqm: z.number().positive(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { items, ...header } = input
      const { data: bom, error } = await ctx.supabase
        .from('bom_templates')
        .insert({ ...header, tenant_id: ctx.tenantId })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      if (items.length > 0) {
        const rows = items.map(it => ({ ...it, bom_id: bom.id, tenant_id: ctx.tenantId }))
        const { error: itemErr } = await ctx.supabase.from('bom_items').insert(rows)
        if (itemErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: itemErr.message })
      }
      return bom
    }),

  update: authorizedProcedure('MANAGE_PRODUCTION')
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        name: z.string().min(1).max(200).optional(),
        glass_type: z.string().optional(),
        thickness_mm: z.number().optional(),
        notes: z.string().optional(),
        items: z.array(z.object({
          item_id: z.string().uuid(),
          qty_per_sqm: z.number().positive(),
          notes: z.string().optional(),
        })).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const { items, ...rest } = input.data
      if (Object.keys(rest).length > 0) {
        const { error } = await ctx.supabase
          .from('bom_templates')
          .update(rest)
          .eq('id', input.id)
          .eq('tenant_id', ctx.tenantId)
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      if (items) {
        await ctx.supabase.from('bom_items').delete().eq('bom_id', input.id)
        const rows = items.map(it => ({ ...it, bom_id: input.id, tenant_id: ctx.tenantId }))
        if (rows.length > 0) await ctx.supabase.from('bom_items').insert(rows)
      }
      return { success: true }
    }),

  delete: authorizedProcedure('MANAGE_PRODUCTION')
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('bom_templates')
        .delete()
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  // Calculate material cost for a given area and BOM template
  calcCost: tenantProcedure
    .input(z.object({ bom_id: z.string().uuid(), area_sqm: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const { data: bom } = await ctx.supabase
        .from('bom_templates')
        .select('*, bom_items(qty_per_sqm, inventory_items(name, unit_cost))')
        .eq('id', input.bom_id)
        .single()
      if (!bom) throw new TRPCError({ code: 'NOT_FOUND' })

      const lines = ((bom as any).bom_items ?? []).map((bi: any) => ({
        name: bi.inventory_items?.name,
        qty: bi.qty_per_sqm * input.area_sqm,
        unit_cost: Number(bi.inventory_items?.unit_cost ?? 0),
        amount: bi.qty_per_sqm * input.area_sqm * Number(bi.inventory_items?.unit_cost ?? 0),
      }))
      const total = lines.reduce((s: number, l: any) => s + l.amount, 0)
      return { lines, total }
    }),
})
