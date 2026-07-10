import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, tenantProcedure } from '../init'

export const reportsRouter = router({
  // ── Sales Report ────────────────────────────────────────────────────────
  sales: tenantProcedure
    .input(z.object({
      from_date: z.string(),
      to_date: z.string(),
      group_by: z.enum(['day', 'week', 'month']).default('month'),
    }))
    .query(async ({ ctx, input }) => {
      // Invoices by period
      const { data: invoices, error: invErr } = await ctx.supabase
        .from('invoices')
        .select('id, invoice_date, total_amount, status, client_id, clients(name)')
        .eq('tenant_id', ctx.tenantId)
        .gte('invoice_date', input.from_date)
        .lte('invoice_date', input.to_date)
        .order('invoice_date')
      if (invErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: invErr.message })

      // Quotations converted
      const { data: quotes, error: qErr } = await ctx.supabase
        .from('quotations')
        .select('id, created_at, total_amount, status')
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
        existing.revenue += Number(inv.total_amount) || 0
        existing.invoiceCount++
        if (inv.status === 'paid') existing.paidCount++
        periodMap.set(key, existing)
      }

      const totalRevenue = invList.reduce((s, i) => s + (Number(i.total_amount) || 0), 0)
      const paidRevenue = invList.filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.total_amount) || 0), 0)
      const conversionRate = quoteList.length > 0
        ? (quoteList.filter(q => q.status === 'accepted').length / quoteList.length) * 100
        : 0

      // Top clients
      const clientMap = new Map<string, { name: string; revenue: number }>()
      for (const inv of invList) {
        const cid = inv.client_id
        const cname = (inv.clients as any)?.name ?? 'Unknown'
        const existing = clientMap.get(cid) ?? { name: cname, revenue: 0 }
        existing.revenue += Number(inv.total_amount) || 0
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
    }),

  // ── Production Report ───────────────────────────────────────────────────
  production: tenantProcedure
    .input(z.object({
      from_date: z.string(),
      to_date: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { data: orders, error } = await ctx.supabase
        .from('work_orders')
        .select('id, status, priority, glass_type, quantity, area_sqft, created_at, completed_at, project_id')
        .eq('tenant_id', ctx.tenantId)
        .gte('created_at', input.from_date)
        .lte('created_at', input.to_date)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const { data: qcData, error: qcErr } = await ctx.supabase
        .from('qc_checks')
        .select('id, result, work_order_id, checked_at')
        .eq('tenant_id', ctx.tenantId)
        .gte('checked_at', input.from_date)
        .lte('checked_at', input.to_date)
      if (qcErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: qcErr.message })

      const orderList = (orders ?? []) as any[]
      const qcList = (qcData ?? []) as any[]

      const totalOrders = orderList.length
      const completedOrders = orderList.filter(o => o.status === 'completed').length
      const totalArea = orderList.reduce((s, o) => s + (Number(o.area_sqft) || 0), 0)
      const passedQC = qcList.filter(q => q.result === 'pass').length
      const failedQC = qcList.filter(q => q.result === 'fail').length

      // By glass type
      const glassMap = new Map<string, { count: number; area: number }>()
      for (const o of orderList) {
        const gt = o.glass_type ?? 'Unknown'
        const ex = glassMap.get(gt) ?? { count: 0, area: 0 }
        ex.count++
        ex.area += Number(o.area_sqft) || 0
        glassMap.set(gt, ex)
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
          totalAreaSqft: Math.round(totalArea * 100) / 100,
          qcPassRate: (passedQC + failedQC) > 0 ? Math.round((passedQC / (passedQC + failedQC)) * 100) : 0,
          passedQC,
          failedQC,
        },
        byGlassType: Array.from(glassMap.entries())
          .map(([type, v]) => ({ type, ...v }))
          .sort((a, b) => b.count - a.count),
        byStatus: Array.from(statusMap.entries())
          .map(([status, count]) => ({ status, count })),
      }
    }),

  // ── Inventory Report ────────────────────────────────────────────────────
  inventory: tenantProcedure.query(async ({ ctx }) => {
    const { data: items, error } = await ctx.supabase
      .from('inventory_items')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .order('name')
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    const { data: movements, error: mvErr } = await ctx.supabase
      .from('stock_movements')
      .select('item_id, type, quantity, created_at')
      .eq('tenant_id', ctx.tenantId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
    if (mvErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: mvErr.message })

    const itemList = (items ?? []) as any[]
    const mvList = (movements ?? []) as any[]

    const totalItems = itemList.length
    const totalValue = itemList.reduce((s, i) => s + (Number(i.current_stock) * Number(i.unit_cost || 0)), 0)
    const lowStockItems = itemList.filter(i => Number(i.current_stock) <= Number(i.min_stock || 0))
    const outOfStockItems = itemList.filter(i => Number(i.current_stock) <= 0)

    // 30-day movement by item
    const mvByItem = new Map<string, { inbound: number; outbound: number }>()
    for (const mv of mvList) {
      const ex = mvByItem.get(mv.item_id) ?? { inbound: 0, outbound: 0 }
      if (mv.type === 'in') ex.inbound += Number(mv.quantity)
      else ex.outbound += Number(mv.quantity)
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
        sku: i.sku,
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
  }),

  // ── Financial Summary ───────────────────────────────────────────────────
  financial: tenantProcedure
    .input(z.object({
      from_date: z.string(),
      to_date: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Revenue from invoices
      const { data: invData } = await ctx.supabase
        .from('invoices')
        .select('total_amount, status, invoice_date')
        .eq('tenant_id', ctx.tenantId)
        .gte('invoice_date', input.from_date)
        .lte('invoice_date', input.to_date)

      // Expenses from purchase orders
      const { data: poData } = await ctx.supabase
        .from('purchase_orders')
        .select('total_amount, status, order_date')
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

      const totalRevenue = invList.reduce((s, i) => s + (Number(i.total_amount) || 0), 0)
      const paidRevenue = invList.filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.total_amount) || 0), 0)
      const totalExpenses = poList.filter(p => p.status !== 'cancelled').reduce((s, p) => s + (Number(p.total_amount) || 0), 0)

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
    }),
})
