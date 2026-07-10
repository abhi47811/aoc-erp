'use client'

import { trpc } from '@/lib/trpc'

export default function InventoryReportPage() {
  const { data, isLoading } = trpc.reports.inventory.useQuery()
  const d = data as any

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Inventory Report</h1>
          <p className="text-sm text-zinc-400 mt-1">Stock levels, alerts, and movement trends</p>
        </div>
        <a href="/reports" className="text-zinc-400 hover:text-zinc-200 text-sm">← Reports</a>
      </div>

      {isLoading && <div className="text-zinc-400 text-sm">Loading…</div>}

      {d && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Items', value: String(d.summary.totalItems), color: 'text-zinc-200' },
              { label: 'Inventory Value', value: `₹${Number(d.summary.totalValue).toLocaleString()}`, color: 'text-green-400' },
              { label: 'Low Stock', value: String(d.summary.lowStockCount), color: Number(d.summary.lowStockCount) > 0 ? 'text-amber-400' : 'text-green-400' },
              { label: 'Out of Stock', value: String(d.summary.outOfStockCount), color: Number(d.summary.outOfStockCount) > 0 ? 'text-red-400' : 'text-green-400' },
            ].map(c => (
              <div key={c.label} className="bg-zinc-800 rounded-lg p-4">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">{c.label}</div>
                <div className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Low stock alerts */}
          {d.lowStock.length > 0 && (
            <div className="bg-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Low Stock Alerts</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-700">
                    <th className="text-left px-4 py-2">Item</th>
                    <th className="text-left px-4 py-2">Category</th>
                    <th className="text-right px-4 py-2">Stock</th>
                    <th className="text-right px-4 py-2">Min</th>
                    <th className="text-right px-4 py-2">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                  {d.lowStock.map((item: any) => (
                    <tr key={item.id} className="hover:bg-zinc-700/30">
                      <td className="px-4 py-2 text-zinc-200">{item.name}</td>
                      <td className="px-4 py-2 text-zinc-400">{item.category ?? '—'}</td>
                      <td className={`px-4 py-2 text-right font-medium ${Number(item.current_qty) === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                        {Number(item.current_qty).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right text-zinc-400">{Number(item.min_qty).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-zinc-500">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* By category */}
            <div className="bg-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-200">By Category</h3>
              </div>
              {d.byCategory.length === 0 ? (
                <div className="p-4 text-zinc-500 text-sm">No data</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-700">
                      <th className="text-left px-4 py-2">Category</th>
                      <th className="text-right px-4 py-2">Items</th>
                      <th className="text-right px-4 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-700">
                    {d.byCategory.map((row: any) => (
                      <tr key={row.category} className="hover:bg-zinc-700/30">
                        <td className="px-4 py-2 text-zinc-200">{row.category ?? 'Uncategorized'}</td>
                        <td className="px-4 py-2 text-right text-zinc-300">{row.count}</td>
                        <td className="px-4 py-2 text-right text-green-400">₹{Number(row.value).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top movers */}
            <div className="bg-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-200">Top Movers (30d)</h3>
              </div>
              {d.topMovers.length === 0 ? (
                <div className="p-4 text-zinc-500 text-sm">No movement data</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-700">
                      <th className="text-left px-4 py-2">Item</th>
                      <th className="text-right px-4 py-2">Qty Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-700">
                    {d.topMovers.map((item: any) => (
                      <tr key={item.id} className="hover:bg-zinc-700/30">
                        <td className="px-4 py-2 text-zinc-200">{item.name}</td>
                        <td className="px-4 py-2 text-right text-blue-400">{Number(item.totalOut).toFixed(2)}</td>
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
