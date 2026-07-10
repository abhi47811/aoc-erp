import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, tenantProcedure } from '../init'

const POItemInput = z.object({
  item_id: z.string().uuid().optional(),
  description: z.string().min(1),
  qty: z.number().positive(),
  unit_price: z.number().min(0),
})

export const purchaseRouter = router({
  list: tenantProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('purchase_orders')
        .select('*, suppliers(name)')
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
        .from('purchase_orders')
        .select('*, suppliers(name), purchase_order_items(*, inventory_items(name, unit))')
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
        .single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: error.message })
      return data
    }),

  create: tenantProcedure
    .input(z.object({
      number: z.string().min(1).max(50),
      supplier_id: z.string().uuid().optional(),
      order_date: z.string(),
      expected_date: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(POItemInput),
    }))
    .mutation(async ({ ctx, input }) => {
      const { items, ...header } = input
      const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0)

      const { data: po, error: poErr } = await ctx.supabase
        .from('purchase_orders')
        .insert({
          ...header,
          tenant_id: ctx.tenantId,
          created_by: ctx.user.id,
          subtotal: subtotal.toFixed(2),
          total: subtotal.toFixed(2),
        })
        .select()
        .single()
      if (poErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: poErr.message })

      if (items.length > 0) {
        const rows = items.map((it, i) => ({
          ...it,
          po_id: po.id,
          tenant_id: ctx.tenantId,
          amount: (it.qty * it.unit_price).toFixed(2),
          sort_order: i,
        }))
        const { error: itemErr } = await ctx.supabase.from('purchase_order_items').insert(rows)
        if (itemErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: itemErr.message })
      }
      return po
    }),

  update: tenantProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        number: z.string().min(1).max(50).optional(),
        supplier_id: z.string().uuid().optional(),
        status: z.enum(['draft','sent','partial','received','cancelled']).optional(),
        order_date: z.string().optional(),
        expected_date: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(POItemInput).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const { items, ...rest } = input.data
      const headerPatch: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() }

      if (items) {
        const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0)
        headerPatch.subtotal = subtotal.toFixed(2)
        headerPatch.total = subtotal.toFixed(2)

        await ctx.supabase.from('purchase_order_items').delete().eq('po_id', input.id).eq('tenant_id', ctx.tenantId)
        const rows = items.map((it, i) => ({
          ...it,
          po_id: input.id,
          tenant_id: ctx.tenantId,
          amount: (it.qty * it.unit_price).toFixed(2),
          sort_order: i,
        }))
        if (rows.length > 0) await ctx.supabase.from('purchase_order_items').insert(rows)
      }

      const { error } = await ctx.supabase
        .from('purchase_orders')
        .update(headerPatch)
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  receive: tenantProcedure
    .input(z.object({
      id: z.string().uuid(),
      received: z.array(z.object({ item_line_id: z.string().uuid(), received_qty: z.number().min(0) })),
    }))
    .mutation(async ({ ctx, input }) => {
      for (const line of input.received) {
        const { data: poItem } = await ctx.supabase
          .from('purchase_order_items')
          .select('*')
          .eq('id', line.item_line_id)
          .single()
        if (!poItem) continue

        await ctx.supabase
          .from('purchase_order_items')
          .update({ received_qty: line.received_qty })
          .eq('id', line.item_line_id)

        if (poItem.item_id && line.received_qty > 0) {
          const { data: invItem } = await ctx.supabase
            .from('inventory_items')
            .select('current_stock')
            .eq('id', poItem.item_id)
            .single()

          if (invItem) {
            const delta = line.received_qty - Number(poItem.received_qty)
            await ctx.supabase.from('inventory_items').update({
              current_stock: (Number(invItem.current_stock) + delta).toFixed(3),
              updated_at: new Date().toISOString(),
            }).eq('id', poItem.item_id)

            await ctx.supabase.from('stock_movements').insert({
              tenant_id: ctx.tenantId,
              item_id: poItem.item_id,
              movement_type: 'purchase',
              qty: delta,
              unit_cost: poItem.unit_price,
              reference_id: input.id,
              reference_type: 'purchase_order',
              created_by: ctx.user.id,
            })
          }
        }
      }

      const { data: allItems } = await ctx.supabase
        .from('purchase_order_items')
        .select('qty, received_qty')
        .eq('po_id', input.id)

      const allReceived = (allItems ?? []).every(
        (it: any) => Number(it.received_qty) >= Number(it.qty)
      )
      const anyReceived = (allItems ?? []).some(
        (it: any) => Number(it.received_qty) > 0
      )

      await ctx.supabase.from('purchase_orders').update({
        status: allReceived ? 'received' : anyReceived ? 'partial' : 'sent',
        updated_at: new Date().toISOString(),
      }).eq('id', input.id)

      return { success: true }
    }),

  delete: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('purchase_orders')
        .delete()
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
