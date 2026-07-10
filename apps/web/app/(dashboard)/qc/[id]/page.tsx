'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'

const DEFAULT_CHECKS = [
  'Dimensions verified',
  'Edge quality (no chips)',
  'Surface quality (no scratches)',
  'Tempering compliance',
  'Laminate integrity',
  'Coating uniformity',
  'Hole positions correct',
  'Cutout quality',
  'Packaging adequate',
]

export default function QCPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [newCheck, setNewCheck] = useState('')
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  const { data: wo } = trpc.workOrder.get.useQuery(id)
  const { data: checks = [], refetch } = trpc.qc.getChecks.useQuery(id)
  const upsert = trpc.qc.upsertChecks.useMutation({ onSuccess: () => refetch() })
  const updateCheck = trpc.qc.updateCheck.useMutation({ onSuccess: () => { refetch(); setNoteFor(null); setNoteText('') } })
  const deleteCheck = trpc.qc.deleteCheck.useMutation({ onSuccess: () => refetch() })

  const woData = wo as any
  const checksData = checks as any[]

  function addDefaults() {
    const existing = new Set(checksData.map((c: any) => c.check_name))
    const toAdd = DEFAULT_CHECKS.filter(c => !existing.has(c))
    if (toAdd.length > 0) {
      upsert.mutate({ wo_id: id, checks: toAdd.map(c => ({ check_name: c })) })
    }
  }

  function addCustom() {
    if (!newCheck.trim()) return
    upsert.mutate({ wo_id: id, checks: [{ check_name: newCheck.trim() }] })
    setNewCheck('')
  }

  const passed = checksData.filter((c: any) => c.status === 'passed').length
  const failed = checksData.filter((c: any) => c.status === 'failed').length
  const pending = checksData.filter((c: any) => c.status === 'pending').length

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">QC Checklist</h1>
          {woData && (
            <p className="text-sm text-slate-500 mt-0.5">WO #{woData.number} · {woData.clients?.name ?? '—'}</p>
          )}
        </div>
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">← Back</button>
      </div>

      {/* Summary */}
      {checksData.length > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
            <div className="text-2xl font-semibold text-emerald-700">{passed}</div>
            <div className="text-xs text-emerald-600">Passed</div>
          </div>
          <div className="flex-1 bg-red-50 border border-red-100 rounded-lg p-3 text-center">
            <div className="text-2xl font-semibold text-red-700">{failed}</div>
            <div className="text-xs text-red-600">Failed</div>
          </div>
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-semibold text-slate-700">{pending}</div>
            <div className="text-xs text-slate-500">Pending</div>
          </div>
        </div>
      )}

      {/* Setup */}
      {checksData.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center space-y-3">
          <p className="text-sm text-slate-400">No checks defined yet.</p>
          <button onClick={addDefaults} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Load Default Checks
          </button>
        </div>
      )}

      {/* Checks list */}
      {checksData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {checksData.map((check: any) => (
            <div key={check.id} className="p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <button
                    onClick={() => updateCheck.mutate({ id: check.id, status: 'passed' })}
                    className={`w-7 h-7 rounded text-xs font-bold transition-colors ${check.status === 'passed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-emerald-600 hover:text-white'}`}
                  >✓</button>
                  <button
                    onClick={() => updateCheck.mutate({ id: check.id, status: 'failed' })}
                    className={`w-7 h-7 rounded text-xs font-bold transition-colors ${check.status === 'failed' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-red-600 hover:text-white'}`}
                  >✗</button>
                </div>
                <span className={`flex-1 text-sm ${check.status === 'passed' ? 'text-emerald-600 line-through decoration-emerald-400' : check.status === 'failed' ? 'text-red-600' : 'text-slate-800'}`}>
                  {check.check_name}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => { setNoteFor(check.id); setNoteText(check.notes ?? '') }} className="text-xs text-slate-400 hover:text-slate-600">
                    Note
                  </button>
                  <button onClick={() => deleteCheck.mutate(check.id)} className="text-xs text-red-500 hover:text-red-600">✕</button>
                </div>
              </div>
              {check.notes && (
                <p className="text-xs text-slate-400 ml-16 italic">{check.notes}</p>
              )}
              {noteFor === check.id && (
                <div className="ml-16 flex gap-2">
                  <input
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Add note..."
                    className="flex-1 bg-white text-slate-900 px-2 py-1 rounded text-xs border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                  />
                  <button
                    onClick={() => updateCheck.mutate({ id: check.id, status: check.status, notes: noteText })}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                  >Save</button>
                  <button onClick={() => setNoteFor(null)} className="text-slate-400 hover:text-slate-600 text-xs px-2">✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add custom check */}
      <div className="flex gap-2">
        <input
          value={newCheck}
          onChange={e => setNewCheck(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          placeholder="Add custom check..."
          className="flex-1 bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
        />
        <button onClick={addCustom} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium">Add</button>
      </div>
    </div>
  )
}
