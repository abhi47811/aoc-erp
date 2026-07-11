import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import Anthropic from '@anthropic-ai/sdk'
import { router, tenantProcedure } from '../init'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type Ctx = { supabase: any; tenantId: string }

// ── Sales Report ─────────────────────────────────────────────────────────
const SalesInput = z.object({
  from_date: z.string(),
  to_date: z.string(),
  group_by: z.enum(['day', 'week', 'month']).default('month'),
})

async function buildSalesReport(ctx: Ctx, input: z.infer<typeof SalesInput>) {
  // Invoices by period
  const { data: invoices, error: invErr } = await ctx.supabase
    .from('invoices')
    .select('id, invoice_date, total, status, paid_amount, client_id, clients(name)')
    .eq('tenant_id', ctx.tenantId)
    .gte('invoice_date', input.from_date)
    .lte('invoice_date', input.to_date)
    .order('invoice_date')
  if (invErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: invErr.message })

  // Quotations converted
  const { data: quotes, error: qErr } = await ctx.supabase
    .from('quotations')
    .select('id, created_at, total, status')
    .eq('tenant_id', ctx.tenantId)
    .gte('created_at', input.from_date)
    .lte('created_at', input.to_date)
  if (qErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: qErr.message })

  const invList = (invoices ?? []) as any[]
  const quoteList = (quotes ?? []) as any[]

  // Aggregate by period
  const periodMap = new Map<string, { revenue: number; invoiceCount: number; paidCount: number }>()
  for (const inv of invList) {
    const d = new Date(inv.invoice_date)
    let key: string
    if (input.group_by === 'day') key = inv.invoice_date.slice(0, 10)
    else if (input.group_by === 'week') {
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      key = weekStart.toISOString().slice(0, 10)
    } else key = inv.invoice_date.slice(0, 7)

    const existing = periodMap.get(key) ?? { revenue: 0, invoiceCount: 0, paidCount: 0 }
    existing.revenue += Number(inv.total) || 0
    existing.invoiceCount++
    if (inv.status === 'paid') existing.paidCount++
    periodMap.set(key, existing)
  }

  const totalRevenue = invList.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const paidRevenue = invList.reduce((s, i) => s + (Number(i.paid_amount) || 0), 0)
  const conversionRate = quoteList.length > 0
    ? (quoteList.filter(q => q.status === 'approved' || q.status === 'converted').length / quoteList.length) * 100
    : 0

  // Top clients
  const clientMap = new Map<string, { name: string; revenue: number }>()
  for (const inv of invList) {
    const cid = inv.client_id
    const cname = (inv.clients as any)?.name ?? 'Unknown'
    const existing = clientMap.get(cid) ?? { name: cname, revenue: 0 }
    existing.revenue += Number(inv.total) || 0
    clientMap.set(cid, existing)
  }
  const topClients = Array.from(clientMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return {
    summary: {
      totalRevenue,
      paidRevenue,
      pendingRevenue: totalRevenue - paidRevenue,
      invoiceCount: invList.length,
      quoteCount: quoteList.length,
      conversionRate: Math.round(conversionRate * 10) / 10,
    },
    byPeriod: Array.from(periodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, v]) => ({ period, ...v })),
    topClients,
  }
}

// ── Production Report ────────────────────────────────────────────────────
const ProductionInput = z.object({
  from_date: z.string(),
  to_date: z.string(),
})

async function buildProductionReport(ctx: Ctx, input: z.infer<typeof ProductionInput>) {
  const { data: orders, error } = await ctx.supabase
    .from('work_orders')
    .select('id, status, created_at, project_id, work_order_items(glass_type, qty, width_mm, height_mm)')
    .eq('tenant_id', ctx.tenantId)
    .gte('created_at', input.from_date)
    .lte('created_at', input.to_date)
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

  const { data: qcData, error: qcErr } = await ctx.supabase
    .from('qc_checks')
    .select('id, status, wo_id, checked_at')
    .eq('tenant_id', ctx.tenantId)
    .gte('checked_at', input.from_date)
    .lte('checked_at', input.to_date)
  if (qcErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: qcErr.message })

  const orderList = (orders ?? []) as any[]
  const qcList = (qcData ?? []) as any[]

  const itemArea = (it: any) =>
    (it.qty && it.width_mm && it.height_mm) ? (Number(it.qty) * Number(it.width_mm) * Number(it.height_mm)) / 1_000_000 : 0

  const totalOrders = orderList.length
  const completedOrders = orderList.filter(o => o.status === 'delivered').length
  const totalArea = orderList.reduce(
    (s, o) => s + ((o.work_order_items ?? []) as any[]).reduce((si, it) => si + itemArea(it), 0), 0
  )
  const passedQC = qcList.filter(q => q.status === 'passed').length
  const failedQC = qcList.filter(q => q.status === 'failed').length

  // By glass type (from line items)
  const glassMap = new Map<string, { count: number; area: number }>()
  for (const o of orderList) {
    for (const it of ((o.work_order_items ?? []) as any[])) {
      const gt = it.glass_type ?? 'Unknown'
      const ex = glassMap.get(gt) ?? { count: 0, area: 0 }
      ex.count++
      ex.area += itemArea(it)
      glassMap.set(gt, ex)
    }
  }

  // Status breakdown
  const statusMap = new Map<string, number>()
  for (const o of orderList) {
    statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1)
  }

  return {
    summary: {
      totalOrders,
      completedOrders,
      pendingOrders: totalOrders - completedOrders,
      completionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
      totalAreaSqm: Math.round(totalArea * 100) / 100,
      qcPassRate: (passedQC + failedQC) > 0 ? Math.round((passedQC / (passedQC + failedQC)) * 100) : 0,
      passedQC,
      failedQC,
    },
    byGlassType: Array.from(glassMap.entries())
      .map(([type, v]) => ({ type, count: v.count, area: Math.round(v.area * 100) / 100 }))
      .sort((a, b) => b.count - a.count),
    byStatus: Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count })),
  }
}

// ── Inventory Report ─────────────────────────────────────────────────────
async function buildInventoryReport(ctx: Ctx) {
  const { data: items, error } = await ctx.supabase
    .from('inventory_items')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('name')
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

  const { data: movements, error: mvErr } = await ctx.supabase
    .from('stock_movements')
    .select('item_id, movement_type, qty, created_at')
    .eq('tenant_id', ctx.tenantId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
  if (mvErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: mvErr.message })

  const itemList = (items ?? []) as any[]
  const mvList = (movements ?? []) as any[]

  const totalItems = itemList.length
  const totalValue = itemList.reduce((s, i) => s + (Number(i.current_stock) * Number(i.unit_cost || 0)), 0)
  const lowStockItems = itemList.filter(i => Number(i.current_stock) <= Number(i.min_stock || 0))
  const outOfStockItems = itemList.filter(i => Number(i.current_stock) <= 0)

  // 30-day movement by item (outgoing types subtract stock, matching inventory.addMovement's own logic)
  const OUTGOING_TYPES = new Set(['production_use', 'sale', 'scrap'])
  const mvByItem = new Map<string, { inbound: number; outbound: number }>()
  for (const mv of mvList) {
    const ex = mvByItem.get(mv.item_id) ?? { inbound: 0, outbound: 0 }
    if (OUTGOING_TYPES.has(mv.movement_type)) ex.outbound += Math.abs(Number(mv.qty))
    else ex.inbound += Math.abs(Number(mv.qty))
    mvByItem.set(mv.item_id, ex)
  }

  const byCategory = new Map<string, { count: number; value: number }>()
  for (const i of itemList) {
    const cat = i.category ?? 'Uncategorized'
    const ex = byCategory.get(cat) ?? { count: 0, value: 0 }
    ex.count++
    ex.value += Number(i.current_stock) * Number(i.unit_cost || 0)
    byCategory.set(cat, ex)
  }

  return {
    summary: {
      totalItems,
      totalValue: Math.round(totalValue * 100) / 100,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
    },
    lowStockItems: lowStockItems.map(i => ({
      id: i.id,
      name: i.name,
      sku: i.code,
      currentStock: Number(i.current_stock),
      minStock: Number(i.min_stock || 0),
      unit: i.unit,
    })),
    byCategory: Array.from(byCategory.entries())
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.value - a.value),
    topMovers: itemList
      .map(i => {
        const mv = mvByItem.get(i.id) ?? { inbound: 0, outbound: 0 }
        return { id: i.id, name: i.name, ...mv, total: mv.inbound + mv.outbound }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
  }
}

// ── Financial Summary ────────────────────────────────────────────────────
const FinancialInput = z.object({
  from_date: z.string(),
  to_date: z.string(),
})

async function buildFinancialReport(ctx: Ctx, input: z.infer<typeof FinancialInput>) {
  // Revenue from invoices
  const { data: invData } = await ctx.supabase
    .from('invoices')
    .select('total, status, paid_amount, invoice_date')
    .eq('tenant_id', ctx.tenantId)
    .gte('invoice_date', input.from_date)
    .lte('invoice_date', input.to_date)

  // Expenses from purchase orders
  const { data: poData } = await ctx.supabase
    .from('purchase_orders')
    .select('total, status, order_date')
    .eq('tenant_id', ctx.tenantId)
    .gte('order_date', input.from_date)
    .lte('order_date', input.to_date)

  // Journal lines (net)
  const { data: jlData } = await ctx.supabase
    .from('journal_lines')
    .select(`
      debit, credit,
      chart_of_accounts!inner(account_type),
      journal_entries!inner(date, status, tenant_id)
    `)
    .eq('journal_entries.tenant_id', ctx.tenantId)
    .eq('journal_entries.status', 'posted')
    .gte('journal_entries.date', input.from_date)
    .lte('journal_entries.date', input.to_date)

  const invList = (invData ?? []) as any[]
  const poList = (poData ?? []) as any[]
  const jlList = (jlData ?? []) as any[]

  const totalRevenue = invList.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const paidRevenue = invList.reduce((s, i) => s + (Number(i.paid_amount) || 0), 0)
  const totalExpenses = poList.filter(p => p.status !== 'cancelled').reduce((s, p) => s + (Number(p.total) || 0), 0)

  // From journal lines
  let journalRevenue = 0
  let journalExpenses = 0
  for (const jl of jlList) {
    const type = (jl.chart_of_accounts as any)?.account_type
    if (type === 'revenue') journalRevenue += Number(jl.credit) - Number(jl.debit)
    if (type === 'expense') journalExpenses += Number(jl.debit) - Number(jl.credit)
  }

  return {
    revenue: {
      total: Math.round(totalRevenue * 100) / 100,
      paid: Math.round(paidRevenue * 100) / 100,
      outstanding: Math.round((totalRevenue - paidRevenue) * 100) / 100,
      fromJournal: Math.round(journalRevenue * 100) / 100,
    },
    expenses: {
      total: Math.round(totalExpenses * 100) / 100,
      fromJournal: Math.round(journalExpenses * 100) / 100,
    },
    profit: {
      gross: Math.round((totalRevenue - totalExpenses) * 100) / 100,
      fromJournal: Math.round((journalRevenue - journalExpenses) * 100) / 100,
    },
  }
}

// ── AI Summarization ──────────────────────────────────────────────────────
const REPORT_LABELS: Record<string, string> = {
  sales: 'sales',
  production: 'production',
  inventory: 'inventory',
  financial: 'financial',
}

const SummarizeInput = z.object({
  reportType: z.enum(['sales', 'production', 'inventory', 'financial']),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
})

export const reportsRouter = router({
  sales: tenantProcedure.input(SalesInput).query(({ ctx, input }) => buildSalesReport(ctx, input)),
  production: tenantProcedure.input(ProductionInput).query(({ ctx, input }) => buildProductionReport(ctx, input)),
  inventory: tenantProcedure.query(({ ctx }) => buildInventoryReport(ctx)),
  financial: tenantProcedure.input(FinancialInput).query(({ ctx, input }) => buildFinancialReport(ctx, input)),

  summarize: tenantProcedure
    .input(SummarizeInput)
    .mutation(async ({ ctx, input }) => {
      const from = input.from_date ?? new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
      const to = input.to_date ?? new Date().toISOString().slice(0, 10)

      let data: unknown
      if (input.reportType === 'sales') data = await buildSalesReport(ctx, { from_date: from, to_date: to, group_by: 'month' })
      else if (input.reportType === 'production') data = await buildProductionReport(ctx, { from_date: from, to_date: to })
      else if (input.reportType === 'inventory') data = await buildInventoryReport(ctx)
      else data = await buildFinancialReport(ctx, { from_date: from, to_date: to })

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: `You are a business analyst for a glass fabrication ERP based in India. All monetary values below are in Indian Rupees (INR) — use the ₹ symbol, never $, when citing amounts. Here is the ${REPORT_LABELS[input.reportType]} report data for the period ${from} to ${to}:

${JSON.stringify(data, null, 2)}

Write a 2-3 sentence executive summary of this data in plain business language (no jargon, no restating numbers verbatim). Then, if anything looks unusual, risky, or worth flagging (e.g. low completion/pass rates, low stock, negative margins, concentration in one client), add one sentence starting with "⚠ " calling it out specifically. If nothing stands out, omit the flag entirely — do not invent a concern. Return plain text only, no markdown headers, no JSON.`,
        }],
      })

      const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
      return { summary: text.trim() }
    }),
})
