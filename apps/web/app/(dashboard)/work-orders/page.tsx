'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-700 text-zinc-300',
  cutting: 'bg-blue-900 text-blue-300',
  grinding: 'bg-indigo-900 text-indigo-300',
  tempering: 'bg-orange-900 text-orange-300',
  laminating: 'bg-yellow-900 text-yellow-300',
  assembly: 'bg-purple-900 text-purple-300',
  qc: 'bg-teal-900 text-teal-300',
  dispatch: 'bg-sky-900 text-sky-300',
  delivered: 'bg-green-900 text-green-300',
  cancelled: 'bg-red-900 text-red-300',
}

export default function WorkOrdersPage() {
  const { data: wos = [], isLoading, refetch } = trpc.workOrder.list.useQuery()
  const del = trpc.workOrder.delete.useMutation({ onSuccess: () => refetch() })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Work Orders</h1>
          <p className="text-sm text-zinc-400 mt-1">Track glass fabrication jobs through production stages</p>
        </div>
        <div className="flex gap-3">
          <Link href="/production" className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-4 py-2 rounded-lg text-sm">
            Stage Board
          </Link>
          <Link href="/work-orders/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + New WO
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="text-zinc-400 text-center py-12">Loading...</div>
      ) : (wos as any[]).length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <div className="text-4xl mb-3">🏭</div>
          <p>No work orders yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="bg-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-xs text-zinc-400 uppercase">
                <th className="text-left px-4 py-3">WO Number</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Project</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Due Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(wos as any[]).map((wo: any) => (
                <tr key={wo.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/30">
                  <td className="px-4 py-3 font-medium text-zinc-100">
                    <Link href={`/work-orders/${wo.id}`} className="hover:text-blue-400">
                      {wo.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{wo.clients?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-400">{wo.projects?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[wo.status] ?? 'bg-zinc-700 text-zinc-300'}`}>
                      {wo.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{wo.due_date ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/qc/${wo.id}`} className="text-teal-400 hover:text-teal-300 text-xs">QC</Link>
                      <Link href={`/work-orders/${wo.id}`} className="text-blue-400 hover:text-blue-300 text-xs">Edit</Link>
                      <button
                        onClick={() => confirm('Delete this work order?') && del.mutate(wo.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
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
