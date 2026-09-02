'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { ReportSummaryPanel } from '@/components/report-summary-panel'

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = today.slice(0, 8) + '01'

export default function FinancialReportPage() {
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)

  const { data, isLoading } = trpc.reports.financial.useQuery({ from_date: from, to_date: to })
  const d = data as any

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financial Report</h1>
          <p className="text-sm text-slate-500 mt-0.5">Revenue, expenses, and P&L summary</p>
        </div>
        <a href="/reports" className="text-slate-500 hover:text-slate-600 text-sm transition-colors">← Reports</a>
      </div>

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
          <ReportSummaryPanel reportType="financial" from={from} to={to} />

          {/* P&L summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Revenue', value: `₹${Number(d.revenue?.total ?? 0).toLocaleString()}`, color: 'text-emerald-600' },
              { label: 'Paid Revenue', value: `₹${Number(d.revenue?.paid ?? 0).toLocaleString()}`, color: 'text-emerald-600' },
              { label: 'Outstanding', value: `₹${Number(d.revenue?.outstanding ?? 0).toLocaleString()}`, color: 'text-amber-600' },
              { label: 'Total Expenses', value: `₹${Number(d.expenses?.total ?? 0).toLocaleString()}`, color: 'text-red-600' },
              { label: 'Gross Profit', value: `₹${Number(d.profit?.gross ?? 0).toLocaleString()}`, color: Number(d.profit?.gross) >= 0 ? 'text-emerald-600' : 'text-red-600' },
              { label: 'Net Profit', value: `₹${Number(d.profit?.net ?? 0).toLocaleString()}`, color: Number(d.profit?.net) >= 0 ? 'text-emerald-600' : 'text-red-600' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{c.label}</div>
                <div className={`text-2xl font-semibold mt-1 tabular-nums ${c.color}`}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Expense breakdown */}
          {d.expenses?.byCategory?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Expense Breakdown</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.expenses.byCategory.map((row: any) => {
                    const total = d.expenses.total || 1
                    const pct = ((row.amount / total) * 100).toFixed(1)
                    return (
                      <tr key={row.category} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-800 capitalize">{row.category}</td>
                        <td className="px-4 py-3 text-right text-sm text-red-600 tabular-nums">₹{Number(row.amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-xs text-slate-500 tabular-nums">{pct}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Journal summary */}
          {d.journalSummary && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Posted Journal Entries</div>
                <div className="text-2xl font-semibold text-slate-900 tabular-nums">{d.journalSummary.entryCount}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Debits Posted</div>
                <div className="text-2xl font-semibold text-blue-600 tabular-nums">₹{Number(d.journalSummary.totalDebits ?? 0).toLocaleString()}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
