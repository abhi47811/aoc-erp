'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = today.slice(0, 8) + '01'

export default function FinancialReportPage() {
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)

  const { data, isLoading } = trpc.reports.financial.useQuery({ from_date: from, to_date: to })
  const d = data as any

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Financial Report</h1>
          <p className="text-sm text-zinc-400 mt-1">Revenue, expenses, and P&L summary</p>
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
          {/* P&L summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Revenue', value: `₹${Number(d.revenue?.total ?? 0).toLocaleString()}`, color: 'text-green-400' },
              { label: 'Paid Revenue', value: `₹${Number(d.revenue?.paid ?? 0).toLocaleString()}`, color: 'text-green-300' },
              { label: 'Outstanding', value: `₹${Number(d.revenue?.outstanding ?? 0).toLocaleString()}`, color: 'text-amber-400' },
              { label: 'Total Expenses', value: `₹${Number(d.expenses?.total ?? 0).toLocaleString()}`, color: 'text-red-400' },
              { label: 'Gross Profit', value: `₹${Number(d.profit?.gross ?? 0).toLocaleString()}`, color: Number(d.profit?.gross) >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: 'Net Profit', value: `₹${Number(d.profit?.net ?? 0).toLocaleString()}`, color: Number(d.profit?.net) >= 0 ? 'text-green-400' : 'text-red-400' },
            ].map(c => (
              <div key={c.label} className="bg-zinc-800 rounded-lg p-4">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">{c.label}</div>
                <div className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Expense breakdown */}
          {d.expenses?.byCategory?.length > 0 && (
            <div className="bg-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-200">Expense Breakdown</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-700">
                    <th className="text-left px-4 py-2">Category</th>
                    <th className="text-right px-4 py-2">Amount</th>
                    <th className="text-right px-4 py-2">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                  {d.expenses.byCategory.map((row: any) => {
                    const total = d.expenses.total || 1
                    const pct = ((row.amount / total) * 100).toFixed(1)
                    return (
                      <tr key={row.category} className="hover:bg-zinc-700/30">
                        <td className="px-4 py-2 text-zinc-200 capitalize">{row.category}</td>
                        <td className="px-4 py-2 text-right text-red-400">₹{Number(row.amount).toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-zinc-400">{pct}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Journal summary */}
          {d.journalSummary && (
            <div className="bg-zinc-800 rounded-lg p-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Posted Journal Entries</div>
                <div className="text-lg font-bold text-zinc-200">{d.journalSummary.entryCount}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Total Debits Posted</div>
                <div className="text-lg font-bold text-blue-400">₹{Number(d.journalSummary.totalDebits ?? 0).toLocaleString()}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
