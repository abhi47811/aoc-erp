'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { ReportSummaryPanel } from '@/components/report-summary-panel'

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = today.slice(0, 8) + '01'

export default function SalesReportPage() {
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month')

  const { data, isLoading } = trpc.reports.sales.useQuery({ from_date: from, to_date: to, group_by: groupBy })
  const d = data as any

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales Report</h1>
          <p className="text-sm text-slate-500 mt-0.5">Revenue, invoices, and quote conversion</p>
        </div>
        <a href="/reports" className="text-slate-500 hover:text-slate-600 text-sm transition-colors">← Reports</a>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-white text-slate-700 px-3 py-2 rounded-lg text-sm border border-slate-200" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-white text-slate-700 px-3 py-2 rounded-lg text-sm border border-slate-200" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Group By</label>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)}
            className="bg-white text-slate-700 px-3 py-2 rounded-lg text-sm border border-slate-200">
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
          ))}
        </div>
      )}

      {d && (
        <>
          <ReportSummaryPanel reportType="sales" from={from} to={to} />

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Revenue', value: `₹${Number(d.summary.totalRevenue).toLocaleString()}`, color: 'text-emerald-600' },
              { label: 'Paid Revenue', value: `₹${Number(d.summary.paidRevenue).toLocaleString()}`, color: 'text-emerald-600' },
              { label: 'Pending Revenue', value: `₹${Number(d.summary.pendingRevenue).toLocaleString()}`, color: 'text-amber-600' },
              { label: 'Invoices Raised', value: String(d.summary.invoiceCount), color: 'text-slate-900' },
              { label: 'Quotes Sent', value: String(d.summary.quoteCount), color: 'text-slate-900' },
              { label: 'Conversion Rate', value: `${d.summary.conversionRate}%`, color: 'text-blue-600' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{c.label}</div>
                <div className={`text-2xl font-semibold mt-1 tabular-nums ${c.color}`}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Revenue by period */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Revenue by {groupBy}</h3>
            </div>
            {d.byPeriod.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-10">No data for this period</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Period</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Revenue</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Invoices</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.byPeriod.map((row: any) => (
                    <tr key={row.period} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-800">{row.period}</td>
                      <td className="px-4 py-3 text-right text-sm text-emerald-600 tabular-nums">₹{Number(row.revenue).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600 tabular-nums">{row.invoiceCount}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600 tabular-nums">{row.paidCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Top clients */}
          {d.topClients.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Top Clients</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.topClients.map((c: any, i: number) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-500">{i + 1}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">{c.name}</td>
                      <td className="px-4 py-3 text-right text-sm text-emerald-600 tabular-nums">₹{Number(c.revenue).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
