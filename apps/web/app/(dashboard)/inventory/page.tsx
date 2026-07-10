'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'

const CATEGORIES = ['glass','hardware','consumable','aluminium','other'] as const

export default function InventoryPage() {
  const [category, setCategory] = useState<string>('')
  const { data: items = [], isLoading, refetch } = trpc.inventory.list.useQuery(
    category ? { category } : {}
  )
  const { data: lowStock = [] } = trpc.inventory.lowStock.useQuery()
  const deleteItem = trpc.inventory.delete.useMutation({ onSuccess: () => refetch() })

  const totalValue = items.reduce(
    (s, it) => s + Number(it.current_stock) * Number(it.unit_cost), 0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Inventory</h1>
          {lowStock.length > 0 ? (
            <p className="text-sm text-amber-600 mt-0.5">{lowStock.length} item{lowStock.length > 1 ? 's' : ''} below minimum stock</p>
          ) : (
            <p className="text-sm text-slate-500 mt-0.5">{items.length} items tracked</p>
          )}
        </div>
        <Link href="/inventory/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Add Item
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Items</div>
          <div className="text-2xl font-semibold text-slate-900 tabular-nums">{items.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Stock Value</div>
          <div className="text-2xl font-semibold text-slate-900 tabular-nums">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Low Stock Alerts</div>
          <div className={`text-2xl font-semibold tabular-nums ${lowStock.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{lowStock.length}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['', ...CATEGORIES] as string[]).map(cat => (
          <button
            key={cat || 'all'}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              category === cat
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {['Code', 'Name', 'Category', 'Stock', 'Min', 'Unit Cost', 'Value', ''].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider ${h && h !== '' ? 'text-left' : ''} ${['Stock', 'Min', 'Unit Cost', 'Value'].includes(h) ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">No items found</td>
                </tr>
              ) : items.map(item => {
                const isLow = Number(item.current_stock) <= Number(item.min_stock)
                const value = Number(item.current_stock) * Number(item.unit_cost)
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-slate-600 text-xs">{item.code}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3.5">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs capitalize">{item.category}</span>
                    </td>
                    <td className={`px-4 py-3.5 text-right font-medium tabular-nums ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                      {Number(item.current_stock).toFixed(2)} {item.unit}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-500 tabular-nums">{Number(item.min_stock).toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-right text-slate-700 tabular-nums">₹{Number(item.unit_cost).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3.5 text-right text-slate-700 tabular-nums">₹{value.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3.5 text-right space-x-3">
                      <Link href={`/inventory/${item.id}`} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Edit</Link>
                      <button
                        onClick={() => confirm('Delete item?') && deleteItem.mutate(item.id)}
                        className="text-slate-400 hover:text-red-500 text-xs"
                      >Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
