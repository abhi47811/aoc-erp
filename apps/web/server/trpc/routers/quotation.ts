import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, tenantProcedure, authorizedProcedure } from '../init'

const ItemInput = z.object({
  description: z.string().min(1),
  qty: z.number().positive(),
  unit: z.string().optional(),
  width_mm: z.number().optional(),
  height_mm: z.number().optional(),
  glass_type: z.string().optional(),
  thickness_mm: z.number().optional(),
  unit_price: z.number().min(0),
  sort_order: z.number().int().optional(),
})

const QuotationInput = z.object({
  project_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  number: z.string().min(1).max(50),
  status: z.enum(['draft','sent','approved','rejected','converted']).optional(),
  valid_until: z.string().optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(ItemInput),
})

function calcItem(item: z.infer<typeof ItemInput>) {
  const area_sqm = (item.width_mm && item.height_mm)
    ? (item.qty * item.width_mm * item.height_mm) / 1_000_000
    : null
  const amount = item.qty * item.unit_price
  return { area_sqm, amount }
}

export const quotationRouter = router({
  list: tenantProcedure
    .input(z.object({
      project_id: z.string().uuid().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('quotations')
        .select('*, clients(name), projects(code, name)')
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
      if (input?.project_id) query = query.eq('project_id', input.project_id)
      if (input?.status) query = query.eq('status', input.status)
      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  get: tenantProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('quotations')
        .select('*, clients(name, email, mobile), projects(code, name), quotation_items(*)')
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
        .order('sort_order', { referencedTable: 'quotation_items', ascending: true })
        .single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: 'Quotation not found' })
      return data
    }),

  create: authorizedProcedure('CREATE_QUOTE')
    .input(QuotationInput)
    .mutation(async ({ ctx, input }) => {
      const { items, ...head } = input
      // calc totals
      const calcedItems = items.map((item, i) => {
        const { area_sqm, amount } = calcItem(item)
        return { ...item, area_sqm: area_sqm?.toFixed(6), amount: amount.toFixed(2), sort_order: i }
      })
      const subtotal = calcedItems.reduce((s, i) => s + parseFloat(i.amount), 0)

      const { data: q, error: qErr } = await ctx.supabase
        .from('quotations')
        .insert({
          ...head,
          tenant_id: ctx.tenantId,
          created_by: ctx.user.id,
          subtotal: subtotal.toFixed(2),
          tax_amount: '0',
          total: subtotal.toFixed(2),
        })
        .select()
        .single()
      if (qErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: qErr.message })

      if (calcedItems.length > 0) {
        const { error: iErr } = await ctx.supabase
          .from('quotation_items')
          .insert(calcedItems.map(item => ({ ...item, quotation_id: q.id, tenant_id: ctx.tenantId })))
        if (iErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: iErr.message })
      }
      return q
    }),

  update: authorizedProcedure('CREATE_QUOTE')
    .input(z.object({ id: z.string().uuid(), data: QuotationInput }))
    .mutation(async ({ ctx, input }) => {
      const { items, ...head } = input.data
      const calcedItems = items.map((item, i) => {
        const { area_sqm, amount } = calcItem(item)
        return { ...item, area_sqm: area_sqm?.toFixed(6), amount: amount.toFixed(2), sort_order: i }
      })
      const subtotal = calcedItems.reduce((s, i) => s + parseFloat(i.amount), 0)

      const { error: qErr } = await ctx.supabase
        .from('quotations')
        .update({
          ...head,
          subtotal: subtotal.toFixed(2),
          tax_amount: '0',
          total: subtotal.toFixed(2),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
      if (qErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: qErr.message })

      // replace all items
      await ctx.supabase.from('quotation_items').delete().eq('quotation_id', input.id)
      if (calcedItems.length > 0) {
        await ctx.supabase.from('quotation_items').insert(
          calcedItems.map(item => ({ ...item, quotation_id: input.id, tenant_id: ctx.tenantId }))
        )
      }
      return { id: input.id }
    }),

  updateStatus: authorizedProcedure('CREATE_QUOTE')
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['draft','sent','approved','rejected','converted']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('quotations')
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { id: input.id }
    }),

  delete: authorizedProcedure('CREATE_QUOTE')
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('quotations')
        .delete()
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { id: input }
    }),
})
