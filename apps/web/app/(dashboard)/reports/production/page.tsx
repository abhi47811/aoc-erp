'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = today.slice(0, 8) + '01'

export default function ProductionReportPage() {
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)

  const { data, isLoading } = trpc.reports.production.useQuery({ from_date: from, to_date: to })
  const d = data as any

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Production Report</h1>
          <p className="text-sm text-slate-500 mt-0.5">Work orders, throughput, and QC metrics</p>
        </div>
        <a href="/reports" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">← Reports</a>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-4">
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
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
          ))}
        </div>
      )}

      {d && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Orders', value: String(d.summary.totalOrders), color: 'text-slate-900' },
              { label: 'Completed', value: String(d.summary.completedOrders), color: 'text-emerald-600' },
              { label: 'Completion Rate', value: `${d.summary.completionRate}%`, color: d.summary.completionRate >= 80 ? 'text-emerald-600' : 'text-amber-600' },
              { label: 'Total Area', value: `${Number(d.summary.totalAreaSqm).toLocaleString()} m²`, color: 'text-blue-600' },
              { label: 'QC Pass Rate', value: `${d.summary.qcPassRate}%`, color: d.summary.qcPassRate >= 90 ? 'text-emerald-600' : 'text-red-600' },
              { label: 'QC Passed', value: String(d.summary.passedQC), color: 'text-emerald-600' },
              { label: 'QC Failed', value: String(d.summary.failedQC), color: 'text-red-600' },
              { label: 'Pending Orders', value: String(d.summary.pendingOrders), color: 'text-amber-600' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{c.label}</div>
                <div className={`text-2xl font-semibold mt-1 tabular-nums ${c.color}`}>{c.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* By glass type */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">By Glass Type</h3>
              </div>
              {d.byGlassType.length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-10">No data</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Orders</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Area (sqft)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {d.byGlassType.map((row: any) => (
                      <tr key={row.type} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-800">{row.type}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600 tabular-nums">{row.count}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600 tabular-nums">{Number(row.area).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* By status */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">By Status</h3>
              </div>
              {d.byStatus.length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-10">No data</div>
              ) : (
                <div className="p-4 space-y-3">
                  {d.byStatus.map((row: any) => {
                    const total = d.summary.totalOrders || 1
                    const pct = Math.round((row.count / total) * 100)
                    const colors: Record<string, string> = {
                      completed: 'bg-green-500',
                      in_progress: 'bg-blue-500',
                      pending: 'bg-amber-500',
                      on_hold: 'bg-red-500',
                    }
                    return (
                      <div key={row.status}>
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span className="capitalize">{row.status.replace('_', ' ')}</span>
                          <span>{row.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full">
                          <div className={`h-2 rounded-full ${colors[row.status] ?? 'bg-slate-400'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
