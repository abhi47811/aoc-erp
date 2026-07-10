'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { useState } from 'react'

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = today.slice(0, 8) + '01'
const firstOfYear = today.slice(0, 4) + '-01-01'

export default function ReportsPage() {
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)

  const { data: financial } = trpc.reports.financial.useQuery({ from_date: from, to_date: to })
  const { data: sales } = trpc.reports.sales.useQuery({ from_date: from, to_date: to })
  const { data: production } = trpc.reports.production.useQuery({ from_date: from, to_date: to })
  const { data: inventory } = trpc.reports.inventory.useQuery()

  const fin = financial as any
  const sal = sales as any
  const prod = production as any
  const inv = inventory as any

  const kpis = [
    { label: 'Total Revenue', value: fin ? `₹${Number(fin.revenue?.total ?? 0).toLocaleString()}` : '…', sub: `₹${Number(fin?.revenue?.paid ?? 0).toLocaleString()} paid`, color: 'text-green-400' },
    { label: 'Outstanding', value: fin ? `₹${Number(fin.revenue?.outstanding ?? 0).toLocaleString()}` : '…', sub: 'unpaid invoices', color: 'text-amber-400' },
    { label: 'Gross Profit', value: fin ? `₹${Number(fin.profit?.gross ?? 0).toLocaleString()}` : '…', sub: `from ${sal?.summary?.invoiceCount ?? 0} invoices`, color: Number(fin?.profit?.gross) >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Quote Conversion', value: sal ? `${sal.summary?.conversionRate ?? 0}%` : '…', sub: `${sal?.summary?.quoteCount ?? 0} quotes`, color: 'text-blue-400' },
    { label: 'Production Done', value: prod ? `${prod.summary?.completionRate ?? 0}%` : '…', sub: `${prod?.summary?.completedOrders ?? 0}/${prod?.summary?.totalOrders ?? 0} orders`, color: 'text-purple-400' },
    { label: 'QC Pass Rate', value: prod ? `${prod.summary?.qcPassRate ?? 0}%` : '…', sub: `${prod?.summary?.passedQC ?? 0} passed`, color: 'text-cyan-400' },
    { label: 'Low Stock Items', value: inv ? String(inv.summary?.lowStockCount ?? 0) : '…', sub: `${inv?.summary?.outOfStockCount ?? 0} out of stock`, color: Number(inv?.summary?.lowStockCount) > 0 ? 'text-red-400' : 'text-green-400' },
    { label: 'Inventory Value', value: inv ? `₹${Number(inv.summary?.totalValue ?? 0).toLocaleString()}` : '…', sub: `${inv?.summary?.totalItems ?? 0} items`, color: 'text-zinc-300' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Reports</h1>
          <p className="text-sm text-zinc-400 mt-1">Business intelligence across all modules</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-zinc-700 text-zinc-100 px-3 py-1.5 rounded-lg text-sm border border-zinc-600" />
          <span className="text-zinc-500 text-sm">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-zinc-700 text-zinc-100 px-3 py-1.5 rounded-lg text-sm border border-zinc-600" />
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-zinc-800 rounded-lg p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{kpi.label}</div>
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-zinc-500 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Report nav cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: '/reports/sales', label: 'Sales Report', desc: 'Revenue, invoices, top clients, conversion', color: 'text-green-400' },
          { href: '/reports/production', label: 'Production Report', desc: 'Orders, completion rates, QC metrics', color: 'text-purple-400' },
          { href: '/reports/inventory', label: 'Inventory Report', desc: 'Stock levels, low alerts, top movers', color: 'text-amber-400' },
          { href: '/reports/financial', label: 'Financial Report', desc: 'P&L, expenses, journal summary', color: 'text-blue-400' },
        ].map(card => (
          <Link key={card.href} href={card.href}
            className="bg-zinc-800 hover:bg-zinc-700 rounded-lg p-4 transition-colors group">
            <div className={`text-base font-semibold ${card.color} mb-1 group-hover:underline`}>{card.label}</div>
            <div className="text-xs text-zinc-400">{card.desc}</div>
          </Link>
        ))}
      </div>

      {/* Quick charts — top clients & top glass types */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-zinc-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Top Clients by Revenue</h3>
          {(sal?.topClients ?? []).length === 0 ? (
            <p className="text-zinc-500 text-sm">No data for this period</p>
          ) : (
            <div className="space-y-2">
              {(sal?.topClients ?? []).slice(0, 5).map((c: any, i: number) => {
                const maxRev = sal?.topClients?.[0]?.revenue ?? 1
                const pct = Math.round((c.revenue / maxRev) * 100)
                return (
                  <div key={c.id}>
                    <div className="flex justify-between text-xs text-zinc-300 mb-0.5">
                      <span>{i + 1}. {c.name}</span>
                      <span>₹{Number(c.revenue).toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-700 rounded-full">
                      <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-zinc-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Production by Glass Type</h3>
          {(prod?.byGlassType ?? []).length === 0 ? (
            <p className="text-zinc-500 text-sm">No data for this period</p>
          ) : (
            <div className="space-y-2">
              {(prod?.byGlassType ?? []).slice(0, 5).map((g: any, i: number) => {
                const max = prod?.byGlassType?.[0]?.count ?? 1
                const pct = Math.round((g.count / max) * 100)
                return (
                  <div key={g.type}>
                    <div className="flex justify-between text-xs text-zinc-300 mb-0.5">
                      <span>{i + 1}. {g.type}</span>
                      <span>{g.count} orders · {Number(g.area).toFixed(1)} sqft</span>
                    </div>
                    <div className="h-1.5 bg-zinc-700 rounded-full">
                      <div className="h-1.5 bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
