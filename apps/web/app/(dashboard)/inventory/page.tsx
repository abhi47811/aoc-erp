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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Inventory</h1>
          {lowStock.length > 0 && (
            <p className="text-sm text-amber-400 mt-1">
              ⚠ {lowStock.length} item{lowStock.length > 1 ? 's' : ''} below minimum stock
            </p>
          )}
        </div>
        <Link href="/inventory/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Add Item
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Items</div>
          <div className="text-2xl font-bold text-zinc-100 mt-1">{items.length}</div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Stock Value</div>
          <div className="text-2xl font-bold text-zinc-100 mt-1">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Low Stock Alerts</div>
          <div className={`text-2xl font-bold mt-1 ${lowStock.length > 0 ? 'text-amber-400' : 'text-zinc-100'}`}>{lowStock.length}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', ...CATEGORIES].map(cat => (
          <button
            key={cat || 'all'}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
            }`}
          >
            {cat || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-zinc-400 text-center py-12">Loading...</div>
      ) : (
        <div className="bg-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Code</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Category</th>
                <th className="text-right px-4 py-3 text-zinc-400 font-medium">Stock</th>
                <th className="text-right px-4 py-3 text-zinc-400 font-medium">Min</th>
                <th className="text-right px-4 py-3 text-zinc-400 font-medium">Unit Cost</th>
                <th className="text-right px-4 py-3 text-zinc-400 font-medium">Value</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-500">No items found</td>
                </tr>
              ) : items.map(item => {
                const isLow = Number(item.current_stock) <= Number(item.min_stock)
                const value = Number(item.current_stock) * Number(item.unit_cost)
                return (
                  <tr key={item.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/30">
                    <td className="px-4 py-3 font-mono text-zinc-300">{item.code}</td>
                    <td className="px-4 py-3 text-zinc-100">{item.name}</td>
                    <td className="px-4 py-3">
                      <span className="bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded text-xs capitalize">{item.category}</span>
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${isLow ? 'text-amber-400' : 'text-zinc-100'}`}>
                      {Number(item.current_stock).toFixed(2)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-400">{Number(item.min_stock).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-zinc-300">₹{Number(item.unit_cost).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right text-zinc-300">₹{value.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Link href={`/inventory/${item.id}`} className="text-blue-400 hover:text-blue-300 text-xs">Edit</Link>
                      <button
                        onClick={() => confirm('Delete item?') && deleteItem.mutate(item.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
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
