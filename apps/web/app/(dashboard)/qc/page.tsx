'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-100',
  passed: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  failed: 'bg-red-50 text-red-700 border border-red-100',
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Quality Control</h1>
        <p className="text-sm text-slate-500 mt-0.5">QC checks across all work orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'pending', label: 'Pending' },
          { key: 'passed', label: 'Passed' },
          { key: 'failed', label: 'Failed' },
        ].map(({ key, label }) => (
          <div key={key} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</div>
            <div className="text-2xl font-semibold text-slate-900 tabular-nums">{counts[key] ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[['all', 'All'], ['pending', 'Pending'], ['passed', 'Passed'], ['failed', 'Failed']].map(([key, label]) => (
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
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {list.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">No QC checks found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Check</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Work Order</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Notes</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-800 font-medium">{c.check_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-800 font-mono">{c.work_orders?.number ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">{c.work_orders?.clients?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLORS[c.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {c.status === 'pending' ? (
                          <input
                            value={notesMap[c.id] ?? ''}
                            onChange={e => setNotesMap(m => ({ ...m, [c.id]: e.target.value }))}
                            placeholder="Add notes…"
                            className="bg-white text-slate-800 text-xs px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40"
                          />
                        ) : (
                          <span className="text-xs text-slate-400">{c.notes ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(c.id, 'passed')}
                              disabled={updating === c.id}
                              className="text-xs text-emerald-600 hover:text-emerald-700 disabled:opacity-50 font-medium"
                            >
                              Pass
                            </button>
                            <button
                              onClick={() => handleUpdate(c.id, 'failed')}
                              disabled={updating === c.id}
                              className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50 font-medium"
                            >
                              Fail
                            </button>
                          </div>
                        )}
                        {c.status !== 'pending' && c.checked_at && (
                          <span className="text-xs text-slate-400">
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
      )}
    </div>
  )
}
