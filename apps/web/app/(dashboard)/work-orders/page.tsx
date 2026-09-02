'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import Link from 'next/link'
import { Loader2, AlertTriangle, Sparkles, X } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { MultiSelectFilter } from '@/components/ui/multi-select-filter'
import { Badge, type Tone } from '@/components/ui/badge'

const STATUS_COLORS: Record<string, Tone> = {
  draft:      'neutral',
  cutting:    'info',
  grinding:   'indigo',
  tempering:  'orange',
  laminating: 'yellow',
  assembly:   'violet',
  qc:         'teal',
  dispatch:   'sky',
  delivered:  'success',
  cancelled:  'danger',
}

const SEVERITY_STYLES: Record<string, string> = {
  high:   'bg-red-50 border-red-200 text-red-800',
  medium: 'bg-orange-50 border-orange-200 text-orange-800',
  low:    'bg-yellow-50 border-yellow-200 text-yellow-700',
}

const STATUS_OPTIONS = Object.keys(STATUS_COLORS).map(s => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}))

export default function WorkOrdersPage() {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [showAnomalies, setShowAnomalies] = useState(false)
  const [anomalies, setAnomalies] = useState<any[] | null>(null)

  const { data: wos = [], isLoading, refetch } = trpc.workOrder.list.useQuery()
  const filteredWos = (wos as any[]).filter(wo => selectedStatuses.length === 0 || selectedStatuses.includes(wo.status))
  const del = trpc.workOrder.delete.useMutation({
    onSuccess: () => { refetch(); setDeleteTarget(null) },
    onError: (e) => setDeleteError(e.message),
  })
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const detect = trpc.workOrder.detectAnomalies.useMutation({
    onSuccess: (d) => {
      setAnomalies(d.anomalies)
      setShowAnomalies(true)
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Work Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track glass fabrication jobs through production stages</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => detect.mutate()}
            disabled={detect.isPending}
            className="flex items-center gap-1.5 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-300 text-slate-700 hover:text-violet-700 px-3 py-2 rounded-lg text-sm font-medium transition-all"
          >
            {detect.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <Sparkles size={14} />}
            AI Anomaly Scan
          </button>
          <Link href="/production" className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-all">
            Stage Board
          </Link>
          <Link href="/work-orders/new" className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + New WO
          </Link>
        </div>
      </div>

      {/* Anomaly Panel */}
      {showAnomalies && anomalies !== null && (
        <div className="bg-white rounded-xl border border-violet-200 shadow-elevation-xs p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-violet-600" />
              <span className="font-medium text-slate-900 text-sm">AI Anomaly Scan Results</span>
              <span className="text-xs text-slate-500">{anomalies.length} issue{anomalies.length !== 1 ? 's' : ''} found</span>
            </div>
            <button onClick={() => setShowAnomalies(false)} className="text-slate-500 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
          {anomalies.length === 0 ? (
            <p className="text-sm text-emerald-600">✓ No anomalies detected in active work orders.</p>
          ) : (
            <div className="space-y-2">
              {anomalies.map((a: any, i: number) => (
                <div key={i} className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES.low}`}>
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-xs">{a.wo_number}</span>
                    <span className="mx-1.5 text-xs opacity-60">·</span>
                    <span className="text-xs uppercase tracking-wide opacity-70">{a.type}</span>
                    <p className="text-xs mt-0.5 opacity-90">{a.message}</p>
                  </div>
                  <span className={`ml-auto shrink-0 text-xs font-medium uppercase tracking-wide opacity-70`}>{a.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <MultiSelectFilter label="Status" options={STATUS_OPTIONS} selected={selectedStatuses} onChange={setSelectedStatuses} />
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${85 - i * 8}%` }} />
          ))}
        </div>
      ) : filteredWos.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <p className="text-slate-500 text-sm">No work orders yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {['WO Number', 'Client', 'Project', 'Status', 'Due Date', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWos.map((wo: any) => (
                <tr key={wo.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <Link href={`/work-orders/${wo.id}`} className="font-medium text-slate-900 hover:text-blue-600 font-mono">
                      {wo.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">{wo.clients?.name ?? '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500">{wo.projects?.name ?? '—'}</td>
                  <td className="px-4 py-3.5">
                    <Badge tone={STATUS_COLORS[wo.status] ?? 'neutral'}>
                      {wo.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{wo.due_date ?? '—'}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/qc/${wo.id}`} className="text-teal-600 hover:text-teal-700 text-xs font-medium">QC</Link>
                      <Link href={`/work-orders/${wo.id}`} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Edit</Link>
                      <button
                        onClick={() => { setDeleteError(null); setDeleteTarget({ id: wo.id, label: wo.number }) }}
                        className="text-slate-500 hover:text-red-500 text-xs"
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this work order?"
        description={`WO ${deleteTarget?.label} will be permanently removed. This can't be undone.`}
        pending={del.isPending}
        error={deleteError}
        onConfirm={() => deleteTarget && del.mutate(deleteTarget.id)}
        onCancel={() => { setDeleteTarget(null); setDeleteError(null) }}
      />
    </div>
  )
}
