'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-300',
  passed: 'bg-green-500/20 text-green-300',
  failed: 'bg-red-500/20 text-red-300',
}

export default function QCPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [notesMap, setNotesMap] = useState<Record<string, string>>({})

  const { data: checks = [], isLoading, refetch } = trpc.qc.listChecks.useQuery()
  const updateCheck = trpc.qc.updateCheck.useMutation({ onSuccess: () => refetch() })

  const list = (checks as any[]).filter(c =>
    statusFilter === 'all' || (c.status ?? '') === statusFilter
  )

  const counts = (checks as any[]).reduce((acc: Record<string, number>, c: any) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1
    return acc
  }, {})

  async function handleUpdate(id: string, status: 'passed' | 'failed') {
    setUpdating(id)
    await updateCheck.mutateAsync({ id, status, notes: notesMap[id] })
    setUpdating(null)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Quality Control</h1>
        <p className="text-sm text-zinc-400 mt-1">QC checks across all work orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'pending', label: 'Pending', color: 'text-amber-400' },
          { key: 'passed', label: 'Passed', color: 'text-green-400' },
          { key: 'failed', label: 'Failed', color: 'text-red-400' },
        ].map(({ key, label, color }) => (
          <div key={key} className="bg-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{counts[key] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[['all', 'All'], ['pending', 'Pending'], ['passed', 'Passed'], ['failed', 'Failed']].map(([key, label]) => (
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
          <div className="p-8 text-center text-zinc-500 text-sm">No QC checks found</div>
        )}
        {list.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-700">
                  <th className="text-left px-4 py-3">Check</th>
                  <th className="text-left px-4 py-3">Work Order</th>
                  <th className="text-left px-4 py-3">Client</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Notes</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {list.map((c: any) => (
                  <tr key={c.id} className="hover:bg-zinc-700/30">
                    <td className="px-4 py-3 text-zinc-200 font-medium">{c.check_name}</td>
                    <td className="px-4 py-3 text-zinc-300 font-mono">{c.work_orders?.number ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{c.work_orders?.clients?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status] ?? ''}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.status === 'pending' ? (
                        <input
                          value={notesMap[c.id] ?? ''}
                          onChange={e => setNotesMap(m => ({ ...m, [c.id]: e.target.value }))}
                          placeholder="Add notes…"
                          className="bg-zinc-700 text-zinc-200 text-xs px-2 py-1 rounded border border-zinc-600 focus:outline-none focus:border-blue-500 w-40"
                        />
                      ) : (
                        <span className="text-xs text-zinc-500">{c.notes ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(c.id, 'passed')}
                            disabled={updating === c.id}
                            className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                          >
                            Pass
                          </button>
                          <button
                            onClick={() => handleUpdate(c.id, 'failed')}
                            disabled={updating === c.id}
                            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                          >
                            Fail
                          </button>
                        </div>
                      )}
                      {c.status !== 'pending' && c.checked_at && (
                        <span className="text-xs text-zinc-500">
                          {new Date(c.checked_at).toLocaleDateString('en-IN')}
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
