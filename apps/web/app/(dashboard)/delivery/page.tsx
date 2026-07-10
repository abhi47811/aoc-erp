'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-300',
  in_transit: 'bg-blue-500/20 text-blue-300',
  delivered: 'bg-green-500/20 text-green-300',
  failed: 'bg-red-500/20 text-red-300',
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Delivery</h1>
        <p className="text-sm text-zinc-400 mt-1">Track all deliveries and proof-of-delivery</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="bg-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">{counts[key] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'All'], ...Object.entries(STATUS_LABELS)].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key ?? 'all')}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              statusFilter === key
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-zinc-800 rounded-lg overflow-hidden">
        {isLoading && <div className="p-8 text-center text-zinc-500 text-sm">Loading…</div>}
        {!isLoading && list.length === 0 && (
          <div className="p-8 text-center text-zinc-500 text-sm">No deliveries found</div>
        )}
        {list.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-700">
                  <th className="text-left px-4 py-3">Delivery #</th>
                  <th className="text-left px-4 py-3">Work Order</th>
                  <th className="text-left px-4 py-3">Client</th>
                  <th className="text-left px-4 py-3">Driver</th>
                  <th className="text-left px-4 py-3">Vehicle</th>
                  <th className="text-left px-4 py-3">Scheduled</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {list.map((d: any) => (
                  <tr key={d.id} className="hover:bg-zinc-700/30">
                    <td className="px-4 py-3 font-mono text-zinc-200">{d.number}</td>
                    <td className="px-4 py-3 text-zinc-300">{d.work_orders?.number ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-300">{d.work_orders?.clients?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{d.driver_name ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{d.vehicle_number ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {d.scheduled_date ? new Date(d.scheduled_date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[d.status] ?? ''}`}>
                        {STATUS_LABELS[d.status] ?? d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {d.status === 'pending' && (
                        <button
                          onClick={() => handleStatus(d.id, 'in_transit')}
                          disabled={updating === d.id}
                          className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                        >
                          Start Transit
                        </button>
                      )}
                      {d.status === 'in_transit' && (
                        <button
                          onClick={() => handleStatus(d.id, 'delivered')}
                          disabled={updating === d.id}
                          className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                        >
                          Mark Delivered
                        </button>
                      )}
                      {d.status === 'delivered' && d.delivered_at && (
                        <span className="text-xs text-zinc-500">
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
