'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = today.slice(0, 8) + '01'

export default function SalesReportPage() {
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month')

  const { data, isLoading } = trpc.reports.sales.useQuery({ from_date: from, to_date: to, group_by: groupBy })
  const d = data as any

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Sales Report</h1>
          <p className="text-sm text-zinc-400 mt-1">Revenue, invoices, and quote conversion</p>
        </div>
        <a href="/reports" className="text-zinc-400 hover:text-zinc-200 text-sm">← Reports</a>
      </div>

      {/* Filters */}
      <div className="bg-zinc-800 rounded-lg p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Group By</label>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)}
            className="bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600">
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>

      {isLoading && <div className="text-zinc-400 text-sm">Loading…</div>}

      {d && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Revenue', value: `₹${Number(d.summary.totalRevenue).toLocaleString()}`, color: 'text-green-400' },
              { label: 'Paid Revenue', value: `₹${Number(d.summary.paidRevenue).toLocaleString()}`, color: 'text-green-300' },
              { label: 'Pending Revenue', value: `₹${Number(d.summary.pendingRevenue).toLocaleString()}`, color: 'text-amber-400' },
              { label: 'Invoices Raised', value: String(d.summary.invoiceCount), color: 'text-zinc-200' },
              { label: 'Quotes Sent', value: String(d.summary.quoteCount), color: 'text-zinc-200' },
              { label: 'Conversion Rate', value: `${d.summary.conversionRate}%`, color: 'text-blue-400' },
            ].map(c => (
              <div key={c.label} className="bg-zinc-800 rounded-lg p-4">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">{c.label}</div>
                <div className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Revenue by period */}
          <div className="bg-zinc-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-700">
              <h3 className="text-sm font-semibold text-zinc-200">Revenue by {groupBy}</h3>
            </div>
            {d.byPeriod.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-sm">No data for this period</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 uppercase tracking-wide border-b border-zinc-700">
                    <th className="text-left px-4 py-2">Period</th>
                    <th className="text-right px-4 py-2">Revenue</th>
                    <th className="text-right px-4 py-2">Invoices</th>
                    <th className="text-right px-4 py-2">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                  {d.byPeriod.map((row: any) => (
                    <tr key={row.period} className="hover:bg-zinc-700/30">
                      <td className="px-4 py-2 text-zinc-200">{row.period}</td>
                      <td className="px-4 py-2 text-right text-green-400">₹{Number(row.revenue).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-zinc-300">{row.invoiceCount}</td>
                      <td className="px-4 py-2 text-right text-zinc-300">{row.paidCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Top clients */}
          {d.topClients.length > 0 && (
            <div className="bg-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-200">Top Clients</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 uppercase tracking-wide border-b border-zinc-700">
                    <th className="text-left px-4 py-2">#</th>
                    <th className="text-left px-4 py-2">Client</th>
                    <th className="text-right px-4 py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                  {d.topClients.map((c: any, i: number) => (
                    <tr key={c.id} className="hover:bg-zinc-700/30">
                      <td className="px-4 py-2 text-zinc-500">{i + 1}</td>
                      <td className="px-4 py-2 text-zinc-200">{c.name}</td>
                      <td className="px-4 py-2 text-right text-green-400">₹{Number(c.revenue).toLocaleString()}</td>
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
