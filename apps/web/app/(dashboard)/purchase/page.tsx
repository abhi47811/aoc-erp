'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'

const STATUSES = ['draft','sent','partial','received','cancelled'] as const

const STATUS_COLORS: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'violet' | 'neutral'> = {
  draft: 'neutral',
  sent: 'info',
  partial: 'warning',
  received: 'success',
  cancelled: 'danger',
}

export default function PurchasePage() {
  const [status, setStatus] = useState<string>('')
  const { data: orders = [], isLoading, refetch } = trpc.purchase.list.useQuery(
    status ? { status } : {}
  )
  const deleteOrder = trpc.purchase.delete.useMutation({
    onSuccess: () => { refetch(); setDeleteTarget(null) },
    onError: (e) => setDeleteError(e.message),
  })
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Purchase Orders</h1>
        <Link href="/purchase/new" className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + New PO
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {['', ...STATUSES].map(s => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              status === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">PO Number</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Supplier</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Order Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Expected</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-sm text-slate-500">No purchase orders found</td>
                </tr>
              ) : orders.map((po: any) => (
                <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-900">{po.number}</td>
                  <td className="px-4 py-3 text-slate-800">{po.suppliers?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_COLORS[po.status] ?? 'neutral'} className="capitalize">
                      {po.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{po.order_date}</td>
                  <td className="px-4 py-3 text-slate-500">{po.expected_date ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-800 font-medium tabular-nums">₹{Number(po.total).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <Link href={`/purchase/${po.id}`} className="text-blue-600 hover:text-blue-700 text-xs font-medium">View</Link>
                    {po.status === 'draft' && (
                      <button
                        onClick={() => { setDeleteError(null); setDeleteTarget({ id: po.id, label: po.number }) }}
                        className="text-slate-500 hover:text-red-500 text-xs"
                      >Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this purchase order?"
        description={`PO ${deleteTarget?.label} will be permanently removed. This can't be undone.`}
        pending={deleteOrder.isPending}
        error={deleteError}
        onConfirm={() => deleteTarget && deleteOrder.mutate(deleteTarget.id)}
        onCancel={() => { setDeleteTarget(null); setDeleteError(null) }}
      />
    </div>
  )
}
