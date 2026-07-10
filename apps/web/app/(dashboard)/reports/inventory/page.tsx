'use client'

import { trpc } from '@/lib/trpc'

export default function InventoryReportPage() {
  const { data, isLoading } = trpc.reports.inventory.useQuery()
  const d = data as any

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Inventory Report</h1>
          <p className="text-sm text-slate-500 mt-0.5">Stock levels, alerts, and movement trends</p>
        </div>
        <a href="/reports" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">← Reports</a>
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
              { label: 'Total Items', value: String(d.summary.totalItems), color: 'text-slate-900' },
              { label: 'Inventory Value', value: `₹${Number(d.summary.totalValue).toLocaleString()}`, color: 'text-emerald-600' },
              { label: 'Low Stock', value: String(d.summary.lowStockCount), color: Number(d.summary.lowStockCount) > 0 ? 'text-amber-600' : 'text-emerald-600' },
              { label: 'Out of Stock', value: String(d.summary.outOfStockCount), color: Number(d.summary.outOfStockCount) > 0 ? 'text-red-600' : 'text-emerald-600' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{c.label}</div>
                <div className={`text-2xl font-semibold mt-1 tabular-nums ${c.color}`}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Low stock alerts */}
          {d.lowStock.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <h3 className="text-sm font-semibold text-slate-800">Low Stock Alerts</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Item</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Stock</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Min</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.lowStock.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-800">{item.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{item.category ?? '—'}</td>
                      <td className={`px-4 py-3 text-right text-sm font-medium tabular-nums ${Number(item.current_qty) === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {Number(item.current_qty).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-400 tabular-nums">{Number(item.min_qty).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* By category */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">By Category</h3>
              </div>
              {d.byCategory.length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-10">No data</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Items</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {d.byCategory.map((row: any) => (
                      <tr key={row.category} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-800">{row.category ?? 'Uncategorized'}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600 tabular-nums">{row.count}</td>
                        <td className="px-4 py-3 text-right text-sm text-emerald-600 tabular-nums">₹{Number(row.value).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top movers */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Top Movers (30d)</h3>
              </div>
              {d.topMovers.length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-10">No movement data</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Item</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Qty Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {d.topMovers.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 text-right text-sm text-blue-600 tabular-nums">{Number(item.totalOut).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
