'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge } from '@/components/ui/badge'

const STATUS_COLORS: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'violet' | 'neutral'> = {
  pending: 'warning',
  in_transit: 'info',
  delivered: 'success',
  failed: 'danger',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  failed: 'Failed',
}

export default function DeliveryPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  const { data: deliveries = [], isLoading, refetch } = trpc.delivery.list.useQuery()
  const updateStatus = trpc.delivery.updateStatus.useMutation({
    onSuccess: () => refetch(),
  })

  const list = (deliveries as any[]).filter(d =>
    statusFilter === 'all' || (d.status ?? '') === statusFilter
  )

  const counts = (deliveries as any[]).reduce((acc: Record<string, number>, d: any) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1
    return acc
  }, {})

  async function handleStatus(id: string, status: string) {
    setUpdating(id)
    await updateStatus.mutateAsync({ id, status: status as any })
    setUpdating(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Delivery</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track all deliveries and proof-of-delivery</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">{counts[key] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'All'], ...Object.entries(STATUS_LABELS)].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key ?? 'all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              statusFilter === key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
        {isLoading && (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
            ))}
          </div>
        )}
        {!isLoading && list.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-500">No deliveries found</div>
        )}
        {list.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Delivery #</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Work Order</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Driver</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Vehicle</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Scheduled</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((d: any) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-800">{d.number}</td>
                    <td className="px-4 py-3 text-sm text-slate-800">{d.work_orders?.number ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-800">{d.work_orders?.clients?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{d.driver_name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{d.vehicle_number ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {d.scheduled_date ? new Date(d.scheduled_date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_COLORS[d.status] ?? 'neutral'}>
                        {STATUS_LABELS[d.status] ?? d.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {d.status === 'pending' && (
                        <button
                          onClick={() => handleStatus(d.id, 'in_transit')}
                          disabled={updating === d.id}
                          className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 font-medium"
                        >
                          Start Transit
                        </button>
                      )}
                      {d.status === 'in_transit' && (
                        <button
                          onClick={() => handleStatus(d.id, 'delivered')}
                          disabled={updating === d.id}
                          className="text-xs text-emerald-600 hover:text-emerald-700 disabled:opacity-50 font-medium"
                        >
                          Mark Delivered
                        </button>
                      )}
                      {d.status === 'delivered' && d.delivered_at && (
                        <span className="text-xs text-slate-500">
                          {new Date(d.delivered_at).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
