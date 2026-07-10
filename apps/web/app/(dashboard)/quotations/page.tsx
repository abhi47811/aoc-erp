'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Topbar } from '@/components/topbar'

type QStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'

const STATUS_COLORS: Record<QStatus, string> = {
  draft:     'bg-zinc-500/10 text-zinc-400',
  sent:      'bg-blue-500/10 text-blue-400',
  approved:  'bg-green-500/10 text-green-400',
  rejected:  'bg-red-500/10 text-red-400',
  converted: 'bg-purple-500/10 text-purple-400',
}

export default function QuotationsPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('')

  const { data: quotations = [], isLoading, refetch } = trpc.quotation.list.useQuery(
    statusFilter ? { status: statusFilter } : undefined
  )
  const deleteQ = trpc.quotation.delete.useMutation({ onSuccess: () => refetch() })

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar breadcrumbs={[{ label: 'Quotations' }]} />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100">Quotations</h1>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
            >
              <option value="">All Status</option>
              {(['draft','sent','approved','rejected','converted'] as QStatus[]).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={() => router.push('/quotations/new')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + New Quotation
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-zinc-500 text-sm">Loading…</div>
        ) : quotations.length === 0 ? (
          <div className="text-zinc-500 text-sm text-center py-16">No quotations yet.</div>
        ) : (
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-wide">
                <tr>
                  {['Number','Client','Project','Total','Status','Valid Until',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {quotations.map((q: any) => (
                  <tr
                    key={q.id}
                    className="bg-zinc-950 hover:bg-zinc-900 transition-colors cursor-pointer"
                    onClick={() => router.push(`/quotations/${q.id}`)}
                  >
                    <td className="px-4 py-3 text-zinc-100 font-mono text-xs">{q.number}</td>
                    <td className="px-4 py-3 text-zinc-300">{q.clients?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{q.projects?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-100 font-medium">
                      ₹{Number(q.total).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[q.status as QStatus] ?? ''}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{q.valid_until ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); deleteQ.mutate(q.id) }}
                        className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
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
      </div>
    </div>
  )
}
