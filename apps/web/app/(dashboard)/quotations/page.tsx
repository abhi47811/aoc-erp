'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { MultiSelectFilter } from '@/components/ui/multi-select-filter'

type QStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'

const STATUSES: QStatus[] = ['draft', 'sent', 'approved', 'rejected', 'converted']

const STATUS_COLORS: Record<QStatus, string> = {
  draft:     'bg-slate-100 text-slate-600 border border-slate-200',
  sent:      'bg-blue-50 text-blue-700 border border-blue-100',
  approved:  'bg-emerald-50 text-emerald-700 border border-emerald-100',
  rejected:  'bg-red-50 text-red-700 border border-red-100',
  converted: 'bg-violet-50 text-violet-700 border border-violet-100',
}

const STATUS_OPTIONS = STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))

export default function QuotationsPage() {
  const router = useRouter()
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  const { data: quotations = [], isLoading, refetch } = trpc.quotation.list.useQuery()
  const filteredQuotations = quotations.filter((q: any) => selectedStatuses.length === 0 || selectedStatuses.includes(q.status))
  const deleteQ = trpc.quotation.delete.useMutation({
    onSuccess: () => { refetch(); setDeleteTarget(null) },
    onError: (e) => setDeleteError(e.message),
  })
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quotations</h1>
          <Button onClick={() => router.push('/quotations/new')}>
            + New Quotation
          </Button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          <MultiSelectFilter label="Status" options={STATUS_OPTIONS} selected={selectedStatuses} onChange={setSelectedStatuses} />
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
            ))}
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-16">No quotations yet.</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Number', 'Client', 'Project', 'Total', 'Status', 'Valid Until', ''].map(h => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider ${
                        h === 'Total' || h === '' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.map((q: any) => (
                  <tr
                    key={q.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/quotations/${q.id}`)}
                  >
                    <td className="px-4 py-3.5 font-mono text-slate-600 text-xs">{q.number}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">{q.clients?.name ?? '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600">{q.projects?.name ?? '—'}</td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-900 tabular-nums">
                      ₹{Number(q.total).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${STATUS_COLORS[q.status as QStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{q.valid_until ?? '—'}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteError(null); setDeleteTarget({ id: q.id, label: q.number }) }}
                        className="text-slate-500 hover:text-red-500 text-xs transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this quotation?"
        description={`Quotation ${deleteTarget?.label} will be permanently removed. This can't be undone.`}
        pending={deleteQ.isPending}
        error={deleteError}
        onConfirm={() => deleteTarget && deleteQ.mutate(deleteTarget.id)}
        onCancel={() => { setDeleteTarget(null); setDeleteError(null) }}
      />
    </div>
  )
}
