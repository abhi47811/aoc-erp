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
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">QC Checklist</h1>
          {woData && (
            <p className="text-sm text-zinc-400 mt-1">WO #{woData.number} · {woData.clients?.name ?? '—'}</p>
          )}
        </div>
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-zinc-200 text-sm">← Back</button>
      </div>

      {/* Summary */}
      {checksData.length > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 bg-green-900/30 border border-green-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{passed}</div>
            <div className="text-xs text-green-500">Passed</div>
          </div>
          <div className="flex-1 bg-red-900/30 border border-red-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-400">{failed}</div>
            <div className="text-xs text-red-500">Failed</div>
          </div>
          <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-zinc-300">{pending}</div>
            <div className="text-xs text-zinc-500">Pending</div>
          </div>
        </div>
      )}

      {/* Setup */}
      {checksData.length === 0 && (
        <div className="bg-zinc-800 rounded-lg p-4 text-center space-y-3">
          <p className="text-sm text-zinc-400">No checks defined yet.</p>
          <button onClick={addDefaults} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
            Load Default Checks
          </button>
        </div>
      )}

      {/* Checks list */}
      {checksData.length > 0 && (
        <div className="bg-zinc-800 rounded-lg divide-y divide-zinc-700">
          {checksData.map((check: any) => (
            <div key={check.id} className="p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <button
                    onClick={() => updateCheck.mutate({ id: check.id, status: 'passed' })}
                    className={`w-7 h-7 rounded text-xs font-bold transition-colors ${check.status === 'passed' ? 'bg-green-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-green-700 hover:text-white'}`}
                  >✓</button>
                  <button
                    onClick={() => updateCheck.mutate({ id: check.id, status: 'failed' })}
                    className={`w-7 h-7 rounded text-xs font-bold transition-colors ${check.status === 'failed' ? 'bg-red-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-red-700 hover:text-white'}`}
                  >✗</button>
                </div>
                <span className={`flex-1 text-sm ${check.status === 'passed' ? 'text-green-300 line-through decoration-green-600' : check.status === 'failed' ? 'text-red-300' : 'text-zinc-200'}`}>
                  {check.check_name}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => { setNoteFor(check.id); setNoteText(check.notes ?? '') }} className="text-xs text-zinc-500 hover:text-zinc-300">
                    Note
                  </button>
                  <button onClick={() => deleteCheck.mutate(check.id)} className="text-xs text-red-500 hover:text-red-400">✕</button>
                </div>
              </div>
              {check.notes && (
                <p className="text-xs text-zinc-500 ml-16 italic">{check.notes}</p>
              )}
              {noteFor === check.id && (
                <div className="ml-16 flex gap-2">
                  <input
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Add note..."
                    className="flex-1 bg-zinc-700 text-zinc-100 px-2 py-1 rounded text-xs border border-zinc-600"
                  />
                  <button
                    onClick={() => updateCheck.mutate({ id: check.id, status: check.status, notes: noteText })}
                    className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                  >Save</button>
                  <button onClick={() => setNoteFor(null)} className="text-zinc-400 text-xs px-2">✕</button>
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
          className="flex-1 bg-zinc-800 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-700 focus:border-blue-500 focus:outline-none"
        />
        <button onClick={addCustom} className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-4 py-2 rounded-lg text-sm">Add</button>
      </div>
    </div>
  )
}
