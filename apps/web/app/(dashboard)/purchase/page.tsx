'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'

const STATUSES = ['draft','sent','partial','received','cancelled'] as const

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-600 text-zinc-200',
  sent: 'bg-blue-900 text-blue-200',
  partial: 'bg-amber-900 text-amber-200',
  received: 'bg-green-900 text-green-200',
  cancelled: 'bg-red-900 text-red-200',
}

export default function PurchasePage() {
  const [status, setStatus] = useState<string>('')
  const { data: orders = [], isLoading, refetch } = trpc.purchase.list.useQuery(
    status ? { status } : {}
  )
  const deleteOrder = trpc.purchase.delete.useMutation({ onSuccess: () => refetch() })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Purchase Orders</h1>
        <Link href="/purchase/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + New PO
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {['', ...STATUSES].map(s => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              status === s ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
            }`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-zinc-400 text-center py-12">Loading...</div>
      ) : (
        <div className="bg-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">PO Number</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Supplier</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Order Date</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Expected</th>
                <th className="text-right px-4 py-3 text-zinc-400 font-medium">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500">No purchase orders found</td>
                </tr>
              ) : orders.map((po: any) => (
                <tr key={po.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/30">
                  <td className="px-4 py-3 font-mono text-zinc-100">{po.number}</td>
                  <td className="px-4 py-3 text-zinc-300">{po.suppliers?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[po.status] ?? ''}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{po.order_date}</td>
                  <td className="px-4 py-3 text-zinc-400">{po.expected_date ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-zinc-100 font-medium">₹{Number(po.total).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link href={`/purchase/${po.id}`} className="text-blue-400 hover:text-blue-300 text-xs">View</Link>
                    {po.status === 'draft' && (
                      <button
                        onClick={() => confirm('Delete PO?') && deleteOrder.mutate(po.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
