'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { useState } from 'react'
import {
  TrendingUp, Factory, Package, IndianRupee, ArrowRight, Sparkles,
} from 'lucide-react'

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = today.slice(0, 8) + '01'
const firstOfYear = today.slice(0, 4) + '-01-01'

const REPORT_CARDS = [
  { href: '/reports/sales', label: 'Sales Report', desc: 'Revenue, invoices, top clients, conversion', icon: TrendingUp },
  { href: '/reports/production', label: 'Production Report', desc: 'Orders, completion rates, QC metrics', icon: Factory },
  { href: '/reports/inventory', label: 'Inventory Report', desc: 'Stock levels, low alerts, top movers', icon: Package },
  { href: '/reports/financial', label: 'Financial Report', desc: 'P&L, expenses, journal summary', icon: IndianRupee },
]

export default function ReportsPage() {
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [summary, setSummary] = useState<string | null>(null)

  const summarize = trpc.reports.summarize.useMutation({
    onSuccess: (d) => setSummary(d.summary),
  })

  const { data: financial } = trpc.reports.financial.useQuery({ from_date: from, to_date: to })
  const { data: sales } = trpc.reports.sales.useQuery({ from_date: from, to_date: to })
  const { data: production } = trpc.reports.production.useQuery({ from_date: from, to_date: to })
  const { data: inventory } = trpc.reports.inventory.useQuery()

  const fin = financial as any
  const sal = sales as any
  const prod = production as any
  const inv = inventory as any

  const kpis = [
    { label: 'Total Revenue', value: fin ? `₹${Number(fin.revenue?.total ?? 0).toLocaleString()}` : '…', sub: `₹${Number(fin?.revenue?.paid ?? 0).toLocaleString()} paid`, color: 'text-emerald-600' },
    { label: 'Outstanding', value: fin ? `₹${Number(fin.revenue?.outstanding ?? 0).toLocaleString()}` : '…', sub: 'unpaid invoices', color: 'text-amber-600' },
    { label: 'Gross Profit', value: fin ? `₹${Number(fin.profit?.gross ?? 0).toLocaleString()}` : '…', sub: `from ${sal?.summary?.invoiceCount ?? 0} invoices`, color: Number(fin?.profit?.gross) >= 0 ? 'text-emerald-600' : 'text-red-600' },
    { label: 'Quote Conversion', value: sal ? `${sal.summary?.conversionRate ?? 0}%` : '…', sub: `${sal?.summary?.quoteCount ?? 0} quotes`, color: 'text-blue-600' },
    { label: 'Production Done', value: prod ? `${prod.summary?.completionRate ?? 0}%` : '…', sub: `${prod?.summary?.completedOrders ?? 0}/${prod?.summary?.totalOrders ?? 0} orders`, color: 'text-violet-600' },
    { label: 'QC Pass Rate', value: prod ? `${prod.summary?.qcPassRate ?? 0}%` : '…', sub: `${prod?.summary?.passedQC ?? 0} passed`, color: 'text-cyan-600' },
    { label: 'Low Stock Items', value: inv ? String(inv.summary?.lowStockCount ?? 0) : '…', sub: `${inv?.summary?.outOfStockCount ?? 0} out of stock`, color: Number(inv?.summary?.lowStockCount) > 0 ? 'text-red-600' : 'text-emerald-600' },
    { label: 'Inventory Value', value: inv ? `₹${Number(inv.summary?.totalValue ?? 0).toLocaleString()}` : '…', sub: `${inv?.summary?.totalItems ?? 0} items`, color: 'text-slate-900' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Business intelligence across all modules</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-white text-slate-700 px-3 py-1.5 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
          <span className="text-slate-500 text-sm">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-white text-slate-700 px-3 py-1.5 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{kpi.label}</div>
            <div className={`text-2xl font-semibold tabular-nums ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-slate-500 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* AI Summary */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-violet-500" />
            <span className="text-sm font-medium text-violet-800">AI Business Summary</span>
            <span className="text-xs text-violet-500">for selected period</span>
          </div>
          <button
            onClick={() => summarize.mutate({ reportType: 'financial', from_date: from, to_date: to })}
            disabled={summarize.isPending}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Sparkles size={12} />
            {summarize.isPending ? 'Analysing…' : 'Summarize with AI'}
          </button>
        </div>
        {summary && (
          <p className="mt-3 text-sm text-slate-700 leading-relaxed border-t border-violet-100 pt-3">{summary}</p>
        )}
        {summarize.isError && (
          <p className="mt-2 text-xs text-red-500">Failed to generate summary. Try again.</p>
        )}
      </div>

      {/* Report nav cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {REPORT_CARDS.map(card => (
          <Link key={card.href} href={card.href}
            className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4 hover:border-slate-300 hover:shadow-sm transition-all group block">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                <card.icon size={14} className="text-slate-500 group-hover:text-blue-500 transition-colors" />
              </div>
              <ArrowRight size={13} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-sm font-semibold text-slate-800">{card.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{card.desc}</div>
          </Link>
        ))}
      </div>

      {/* Quick charts — top clients & top glass types */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Top Clients by Revenue</h3>
          {(sal?.topClients ?? []).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">No data for this period</p>
          ) : (
            <div className="space-y-2">
              {(sal?.topClients ?? []).slice(0, 5).map((c: any, i: number) => {
                const maxRev = sal?.topClients?.[0]?.revenue ?? 1
                const pct = Math.round((c.revenue / maxRev) * 100)
                return (
                  <div key={c.id}>
                    <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                      <span>{i + 1}. {c.name}</span>
                      <span>₹{Number(c.revenue).toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Production by Glass Type</h3>
          {(prod?.byGlassType ?? []).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">No data for this period</p>
          ) : (
            <div className="space-y-2">
              {(prod?.byGlassType ?? []).slice(0, 5).map((g: any, i: number) => {
                const max = prod?.byGlassType?.[0]?.count ?? 1
                const pct = Math.round((g.count / max) * 100)
                return (
                  <div key={g.type}>
                    <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                      <span>{i + 1}. {g.type}</span>
                      <span>{g.count} orders · {Number(g.area).toFixed(1)} sqft</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div className="h-1.5 bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
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
