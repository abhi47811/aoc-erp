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
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Production Report</h1>
          <p className="text-sm text-zinc-400 mt-1">Work orders, throughput, and QC metrics</p>
        </div>
        <a href="/reports" className="text-zinc-400 hover:text-zinc-200 text-sm">← Reports</a>
      </div>

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
      </div>

      {isLoading && <div className="text-zinc-400 text-sm">Loading…</div>}

      {d && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Orders', value: String(d.summary.totalOrders), color: 'text-zinc-200' },
              { label: 'Completed', value: String(d.summary.completedOrders), color: 'text-green-400' },
              { label: 'Completion Rate', value: `${d.summary.completionRate}%`, color: d.summary.completionRate >= 80 ? 'text-green-400' : 'text-amber-400' },
              { label: 'Total Area', value: `${Number(d.summary.totalAreaSqft).toLocaleString()} sqft`, color: 'text-blue-400' },
              { label: 'QC Pass Rate', value: `${d.summary.qcPassRate}%`, color: d.summary.qcPassRate >= 90 ? 'text-green-400' : 'text-red-400' },
              { label: 'QC Passed', value: String(d.summary.passedQC), color: 'text-green-300' },
              { label: 'QC Failed', value: String(d.summary.failedQC), color: 'text-red-400' },
              { label: 'Pending Orders', value: String(d.summary.pendingOrders), color: 'text-amber-400' },
            ].map(c => (
              <div key={c.label} className="bg-zinc-800 rounded-lg p-4">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">{c.label}</div>
                <div className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* By glass type */}
            <div className="bg-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-200">By Glass Type</h3>
              </div>
              {d.byGlassType.length === 0 ? (
                <div className="p-4 text-zinc-500 text-sm">No data</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-700">
                      <th className="text-left px-4 py-2">Type</th>
                      <th className="text-right px-4 py-2">Orders</th>
                      <th className="text-right px-4 py-2">Area (sqft)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-700">
                    {d.byGlassType.map((row: any) => (
                      <tr key={row.type} className="hover:bg-zinc-700/30">
                        <td className="px-4 py-2 text-zinc-200">{row.type}</td>
                        <td className="px-4 py-2 text-right text-zinc-300">{row.count}</td>
                        <td className="px-4 py-2 text-right text-zinc-300">{Number(row.area).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* By status */}
            <div className="bg-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-200">By Status</h3>
              </div>
              {d.byStatus.length === 0 ? (
                <div className="p-4 text-zinc-500 text-sm">No data</div>
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
                        <div className="flex justify-between text-xs text-zinc-300 mb-1">
                          <span className="capitalize">{row.status.replace('_', ' ')}</span>
                          <span>{row.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-zinc-700 rounded-full">
                          <div className={`h-2 rounded-full ${colors[row.status] ?? 'bg-zinc-500'}`}
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
