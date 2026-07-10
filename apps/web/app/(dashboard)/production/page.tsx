'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'

const STAGES = [
  { key: 'draft', label: 'Draft', color: 'border-zinc-600' },
  { key: 'cutting', label: 'Cutting', color: 'border-blue-500' },
  { key: 'grinding', label: 'Grinding', color: 'border-indigo-500' },
  { key: 'tempering', label: 'Tempering', color: 'border-orange-500' },
  { key: 'laminating', label: 'Laminating', color: 'border-yellow-500' },
  { key: 'assembly', label: 'Assembly', color: 'border-purple-500' },
  { key: 'qc', label: 'QC', color: 'border-teal-500' },
  { key: 'dispatch', label: 'Dispatch', color: 'border-sky-500' },
  { key: 'delivered', label: 'Delivered', color: 'border-green-500' },
] as const

const NEXT_STAGE: Record<string, string> = {
  draft: 'cutting',
  cutting: 'grinding',
  grinding: 'tempering',
  tempering: 'laminating',
  laminating: 'assembly',
  assembly: 'qc',
  qc: 'dispatch',
  dispatch: 'delivered',
}

export default function ProductionPage() {
  const { data: wos = [], refetch } = trpc.workOrder.list.useQuery()
  const updateStatus = trpc.workOrder.updateStatus.useMutation({ onSuccess: () => refetch() })

  const byStage = (stage: string) =>
    (wos as any[]).filter((wo: any) => wo.status === stage)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Production Board</h1>
          <p className="text-sm text-zinc-400 mt-1">Click "Advance" to move jobs through stages</p>
        </div>
        <Link href="/work-orders/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + New WO
        </Link>
      </div>

      <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 overflow-x-auto">
        {STAGES.map(stage => {
          const items = byStage(stage.key)
          return (
            <div key={stage.key} className={`bg-zinc-800 rounded-lg border-t-2 ${stage.color} min-h-32`}>
              <div className="px-3 py-2 border-b border-zinc-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">{stage.label}</span>
                <span className="text-xs text-zinc-500 bg-zinc-700 rounded-full px-1.5 py-0.5">{items.length}</span>
              </div>
              <div className="p-2 space-y-2">
                {items.map((wo: any) => (
                  <div key={wo.id} className="bg-zinc-700 rounded-lg p-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <Link href={`/work-orders/${wo.id}`} className="text-xs font-medium text-zinc-100 hover:text-blue-400 leading-tight">
                        {wo.number}
                      </Link>
                    </div>
                    {wo.clients?.name && (
                      <p className="text-xs text-zinc-400 truncate">{wo.clients.name}</p>
                    )}
                    {wo.due_date && (
                      <p className="text-xs text-zinc-500">{wo.due_date}</p>
                    )}
                    <div className="flex gap-1 pt-1">
                      {NEXT_STAGE[stage.key] && (
                        <button
                          onClick={() => updateStatus.mutate({ id: wo.id, status: NEXT_STAGE[stage.key] as any })}
                          disabled={updateStatus.isPending}
                          className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs py-1 rounded text-center transition-colors disabled:opacity-50"
                        >
                          Advance →
                        </button>
                      )}
                      {stage.key === 'qc' && (
                        <Link href={`/qc/${wo.id}`} className="flex-1 bg-teal-600/20 hover:bg-teal-600/40 text-teal-300 text-xs py-1 rounded text-center">
                          QC
                        </Link>
                      )}
                      {stage.key === 'dispatch' && (
                        <Link href={`/delivery/${wo.id}`} className="flex-1 bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 text-xs py-1 rounded text-center">
                          POD
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-zinc-600 text-center py-3">Empty</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
