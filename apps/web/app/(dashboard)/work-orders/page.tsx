'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'

const STATUS_COLORS: Record<string, string> = {
  draft:      'bg-slate-100 text-slate-600',
  cutting:    'bg-blue-50 text-blue-700 border border-blue-100',
  grinding:   'bg-indigo-50 text-indigo-700 border border-indigo-100',
  tempering:  'bg-orange-50 text-orange-700 border border-orange-100',
  laminating: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
  assembly:   'bg-violet-50 text-violet-700 border border-violet-100',
  qc:         'bg-teal-50 text-teal-700 border border-teal-100',
  dispatch:   'bg-sky-50 text-sky-700 border border-sky-100',
  delivered:  'bg-emerald-50 text-emerald-700 border border-emerald-100',
  cancelled:  'bg-red-50 text-red-700 border border-red-100',
}

export default function WorkOrdersPage() {
  const { data: wos = [], isLoading, refetch } = trpc.workOrder.list.useQuery()
  const del = trpc.workOrder.delete.useMutation({ onSuccess: () => refetch() })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Work Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track glass fabrication jobs through production stages</p>
        </div>
        <div className="flex gap-2">
          <Link href="/production" className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-all">
            Stage Board
          </Link>
          <Link href="/work-orders/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + New WO
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${85 - i * 8}%` }} />
          ))}
        </div>
      ) : (wos as any[]).length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <p className="text-slate-400 text-sm">No work orders yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {['WO Number', 'Client', 'Project', 'Status', 'Due Date', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(wos as any[]).map((wo: any) => (
                <tr key={wo.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <Link href={`/work-orders/${wo.id}`} className="font-medium text-slate-900 hover:text-blue-600 font-mono">
                      {wo.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">{wo.clients?.name ?? '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500">{wo.projects?.name ?? '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLORS[wo.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {wo.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{wo.due_date ?? '—'}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/qc/${wo.id}`} className="text-teal-600 hover:text-teal-700 text-xs font-medium">QC</Link>
                      <Link href={`/work-orders/${wo.id}`} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Edit</Link>
                      <button
                        onClick={() => confirm('Delete this work order?') && del.mutate(wo.id)}
                        className="text-slate-400 hover:text-red-500 text-xs"
                      >Delete</button>
                    </div>
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
