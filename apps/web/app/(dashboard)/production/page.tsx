'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'

const STAGES = [
  { key: 'draft', label: 'Draft', color: 'border-slate-300' },
  { key: 'cutting', label: 'Cutting', color: 'border-blue-500' },
  { key: 'grinding', label: 'Grinding', color: 'border-indigo-500' },
  { key: 'tempering', label: 'Tempering', color: 'border-orange-500' },
  { key: 'laminating', label: 'Laminating', color: 'border-yellow-500' },
  { key: 'assembly', label: 'Assembly', color: 'border-purple-500' },
  { key: 'qc', label: 'QC', color: 'border-violet-500' },
  { key: 'dispatch', label: 'Dispatch', color: 'border-sky-500' },
  { key: 'delivered', label: 'Delivered', color: 'border-emerald-500' },
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Production Board</h1>
          <p className="text-sm text-slate-500 mt-0.5">Click &quot;Advance&quot; to move jobs through stages</p>
        </div>
        <Link href="/work-orders/new" className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + New WO
        </Link>
      </div>

      <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 overflow-x-auto">
        {STAGES.map(stage => {
          const items = byStage(stage.key)
          return (
            <div key={stage.key} className={`bg-white rounded-xl border border-slate-200 border-t-2 ${stage.color} shadow-elevation-xs min-h-32`}>
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stage.label}</span>
                <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-1.5 py-0.5">{items.length}</span>
              </div>
              <div className="p-2 space-y-2">
                {items.map((wo: any) => (
                  <div key={wo.id} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5 card-hover-lift">
                    <div className="flex items-start justify-between gap-1">
                      <Link href={`/work-orders/${wo.id}`} className="text-xs font-medium text-slate-800 hover:text-blue-600 leading-tight">
                        {wo.number}
                      </Link>
                    </div>
                    {wo.clients?.name && (
                      <p className="text-xs text-slate-500 truncate">{wo.clients.name}</p>
                    )}
                    {wo.due_date && (
                      <p className="text-xs text-slate-500">{wo.due_date}</p>
                    )}
                    <div className="flex gap-1 pt-1">
                      {NEXT_STAGE[stage.key] && (
                        <button
                          onClick={() => updateStatus.mutate({ id: wo.id, status: NEXT_STAGE[stage.key] as any })}
                          disabled={updateStatus.isPending}
                          className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 text-xs py-1 rounded text-center transition-colors disabled:opacity-50"
                        >
                          Advance →
                        </button>
                      )}
                      {stage.key === 'qc' && (
                        <Link href={`/qc/${wo.id}`} className="flex-1 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-100 text-xs py-1 rounded text-center transition-colors">
                          QC
                        </Link>
                      )}
                      {stage.key === 'dispatch' && (
                        <Link href={`/delivery/${wo.id}`} className="flex-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-100 text-xs py-1 rounded text-center transition-colors">
                          POD
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-3">Empty</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
