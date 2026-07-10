import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, tenantProcedure } from '../init'

export const inventoryRouter = router({
  list: tenantProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('inventory_items')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .order('name')
      if (input?.category) q = q.eq('category', input.category)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  get: tenantProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('inventory_items')
        .select('*, stock_movements(*)')
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
        .single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: error.message })
      return data
    }),

  create: tenantProcedure
    .input(z.object({
      code: z.string().min(1).max(50),
      name: z.string().min(1).max(200),
      category: z.enum(['glass','hardware','consumable','aluminium','other']).default('other'),
      unit: z.string().default('pcs'),
      min_stock: z.number().min(0).default(0),
      unit_cost: z.number().min(0).default(0),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('inventory_items')
        .insert({ ...input, tenant_id: ctx.tenantId })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  update: tenantProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        name: z.string().min(1).max(200).optional(),
        category: z.enum(['glass','hardware','consumable','aluminium','other']).optional(),
        unit: z.string().optional(),
        min_stock: z.number().min(0).optional(),
        unit_cost: z.number().min(0).optional(),
        notes: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('inventory_items')
        .update({ ...input.data, updated_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  delete: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('inventory_items')
        .delete()
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  addMovement: tenantProcedure
    .input(z.object({
      item_id: z.string().uuid(),
      movement_type: z.enum(['purchase','production_use','sale','adjustment','scrap','return']),
      qty: z.number(),
      unit_cost: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Insert movement
      const { error: mvErr } = await ctx.supabase
        .from('stock_movements')
        .insert({
          ...input,
          tenant_id: ctx.tenantId,
          created_by: ctx.user.id,
        })
      if (mvErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: mvErr.message })

      // Update current_stock (positive = in, negative = out for outgoing types)
      const outgoing = ['production_use','sale','scrap']
      const delta = outgoing.includes(input.movement_type) ? -Math.abs(input.qty) : Math.abs(input.qty)
      const { data: item } = await ctx.supabase
        .from('inventory_items')
        .select('current_stock')
        .eq('id', input.item_id)
        .single()
      if (item) {
        await ctx.supabase
          .from('inventory_items')
          .update({
            current_stock: (Number(item.current_stock) + delta).toFixed(3),
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.item_id)
          .eq('tenant_id', ctx.tenantId)
      }
      return { success: true }
    }),

  lowStock: tenantProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('inventory_items')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return (data ?? []).filter(
        (it: any) => Number(it.current_stock) <= Number(it.min_stock)
      )
    }),
})
