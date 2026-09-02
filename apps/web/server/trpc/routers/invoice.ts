import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, tenantProcedure } from '../init'

const ItemInput = z.object({
  description: z.string().min(1),
  qty: z.number().positive(),
  unit: z.string().optional(),
  unit_price: z.number().min(0),
  cgst_pct: z.number().min(0).max(50).default(9),
  sgst_pct: z.number().min(0).max(50).default(9),
  igst_pct: z.number().min(0).max(100).default(0),
  sort_order: z.number().int().optional(),
})

const InvoiceInput = z.object({
  project_id: z.string().uuid().optional(),
  quotation_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  number: z.string().min(1).max(50),
  status: z.enum(['draft','sent','paid','partial','cancelled']).optional(),
  invoice_date: z.string(),
  due_date: z.string().optional(),
  supply_state_code: z.number().int().optional(),
  notes: z.string().optional(),
  items: z.array(ItemInput),
})

function calcInvoiceTotals(items: z.infer<typeof ItemInput>[]) {
  let subtotal = 0, cgst = 0, sgst = 0, igst = 0
  const calcedItems = items.map((item, i) => {
    const amount = item.qty * item.unit_price
    const cgst_amt = amount * item.cgst_pct / 100
    const sgst_amt = amount * item.sgst_pct / 100
    const igst_amt = amount * item.igst_pct / 100
    subtotal += amount
    cgst += cgst_amt
    sgst += sgst_amt
    igst += igst_amt
    return { ...item, amount: amount.toFixed(2), sort_order: i }
  })
  return {
    calcedItems,
    subtotal: subtotal.toFixed(2),
    cgst_amount: cgst.toFixed(2),
    sgst_amount: sgst.toFixed(2),
    igst_amount: igst.toFixed(2),
    total: (subtotal + cgst + sgst + igst).toFixed(2),
  }
}

export const invoiceRouter = router({
  list: tenantProcedure
    .input(z.object({
      project_id: z.string().uuid().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('invoices')
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
        .from('invoices')
        .select('*, clients(name, email, mobile, gstin), projects(code, name), invoice_items(*)')
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
        .order('sort_order', { referencedTable: 'invoice_items', ascending: true })
        .single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' })
      return data
    }),

  create: tenantProcedure
    .input(InvoiceInput)
    .mutation(async ({ ctx, input }) => {
      const { items, number: _clientNumber, ...head } = input
      const { calcedItems, ...totals } = calcInvoiceTotals(items)

      // Invoice numbers are GST-statutory (Rule 46: consecutive, unique, not
      // client-forgeable) — always generated server-side, client value ignored.
      const { data: prefixRow } = await ctx.supabase
        .from('tenants')
        .select('invoice_prefix')
        .eq('id', ctx.tenantId)
        .single()

      const { data: number, error: numErr } = await ctx.supabase
        .rpc('next_document_number', {
          p_tenant_id: ctx.tenantId,
          p_doc_type: 'invoice',
          p_prefix: prefixRow?.invoice_prefix ?? null,
        })
      if (numErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: numErr.message })

      const { data: inv, error: invErr } = await ctx.supabase
        .from('invoices')
        .insert({
          ...head,
          number,
          tenant_id: ctx.tenantId,
          created_by: ctx.user.id,
          ...totals,
        })
        .select()
        .single()
      if (invErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: invErr.message })

      if (calcedItems.length > 0) {
        const { error: iErr } = await ctx.supabase
          .from('invoice_items')
          .insert(calcedItems.map(item => ({ ...item, invoice_id: inv.id, tenant_id: ctx.tenantId })))
        if (iErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: iErr.message })
      }
      return inv
    }),

  update: tenantProcedure
    .input(z.object({ id: z.string().uuid(), data: InvoiceInput }))
    .mutation(async ({ ctx, input }) => {
      const { items, ...head } = input.data
      const { calcedItems, ...totals } = calcInvoiceTotals(items)

      const { error: invErr } = await ctx.supabase
        .from('invoices')
        .update({ ...head, ...totals, updated_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
      if (invErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: invErr.message })

      await ctx.supabase.from('invoice_items').delete().eq('invoice_id', input.id)
      if (calcedItems.length > 0) {
        await ctx.supabase.from('invoice_items').insert(
          calcedItems.map(item => ({ ...item, invoice_id: input.id, tenant_id: ctx.tenantId }))
        )
      }
      return { id: input.id }
    }),

  updateStatus: tenantProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['draft','sent','paid','partial','cancelled']),
      paid_amount: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('invoices')
        .update({
          status: input.status,
          ...(input.paid_amount !== undefined ? { paid_amount: input.paid_amount } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { id: input.id }
    }),

  delete: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('invoices')
        .delete()
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { id: input }
    }),
})
