'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Camera, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { NotFoundCard } from '@/components/ui/not-found-card'

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
  const [analyzingFor, setAnalyzingFor] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingCheckRef = useRef<{ id: string; name: string } | null>(null)

  const { data: wo, isError } = trpc.workOrder.get.useQuery(id)
  const { data: checks = [], refetch } = trpc.qc.getChecks.useQuery(id)
  const upsert = trpc.qc.upsertChecks.useMutation({ onSuccess: () => refetch() })
  const updateCheck = trpc.qc.updateCheck.useMutation({ onSuccess: () => { refetch(); setNoteFor(null); setNoteText('') } })
  const deleteCheck = trpc.qc.deleteCheck.useMutation({ onSuccess: () => refetch() })
  const analyzePhoto = trpc.qc.analyzePhoto.useMutation({
    onSuccess: (d, vars) => {
      const check = pendingCheckRef.current
      if (check) {
        setNoteFor(check.id)
        setNoteText(d.analysis)
      }
      setAnalyzingFor(null)
    },
    onError: () => setAnalyzingFor(null),
  })

  function triggerPhotoUpload(checkId: string, checkName: string) {
    pendingCheckRef.current = { id: checkId, name: checkName }
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !pendingCheckRef.current) return
    setAnalyzingFor(pendingCheckRef.current.id)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1] ?? ''
      const mediaType = (file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'
      analyzePhoto.mutate({ checkName: pendingCheckRef.current!.name, imageBase64: base64, mediaType })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

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

  if (isError) return <NotFoundCard entity="work order" backHref="/work-orders" />

  return (
    <div className="max-w-2xl space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">QC Checklist</h1>
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4 text-center space-y-3">
          <p className="text-sm text-slate-500">No checks defined yet.</p>
          <Button onClick={addDefaults}>
            Load Default Checks
          </Button>
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
                    className={`w-7 h-7 rounded text-xs font-bold transition-colors ${check.status === 'passed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-emerald-600 hover:text-white'}`}
                  >✓</button>
                  <button
                    onClick={() => updateCheck.mutate({ id: check.id, status: 'failed' })}
                    className={`w-7 h-7 rounded text-xs font-bold transition-colors ${check.status === 'failed' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-red-600 hover:text-white'}`}
                  >✗</button>
                </div>
                <span className={`flex-1 text-sm ${check.status === 'passed' ? 'text-emerald-600 line-through decoration-emerald-400' : check.status === 'failed' ? 'text-red-600' : 'text-slate-800'}`}>
                  {check.check_name}
                </span>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => triggerPhotoUpload(check.id, check.check_name)}
                    disabled={analyzingFor === check.id}
                    title="Analyze photo with AI"
                    className="text-slate-500 hover:text-violet-600 disabled:opacity-50 transition-colors"
                  >
                    {analyzingFor === check.id
                      ? <Loader2 size={12} className="animate-spin text-violet-500" />
                      : <Camera size={12} />}
                  </button>
                  <button onClick={() => { setNoteFor(check.id); setNoteText(check.notes ?? '') }} className="text-xs text-slate-500 hover:text-slate-600">
                    Note
                  </button>
                  <button onClick={() => deleteCheck.mutate(check.id)} className="text-xs text-red-500 hover:text-red-600">✕</button>
                </div>
              </div>
              {check.notes && (
                <p className="text-xs text-slate-500 ml-[4.5rem] italic">{check.notes}</p>
              )}
              {noteFor === check.id && (
                <div className="ml-[4.5rem] flex gap-2">
                  <input
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Add note..."
                    aria-label={`Note for ${check.check_name}`}
                    className="flex-1 bg-white text-slate-900 px-2 py-1 rounded text-xs border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                  />
                  <button
                    onClick={() => updateCheck.mutate({ id: check.id, status: check.status, notes: noteText })}
                    className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-2 py-1 rounded text-xs font-medium transition-colors"
                  >Save</button>
                  <button onClick={() => setNoteFor(null)} className="text-slate-500 hover:text-slate-600 text-xs px-2">✕</button>
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
          aria-label="Add custom check"
          className="flex-1 bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
        />
        <button onClick={addCustom} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium">Add</button>
      </div>
    </div>
  )
}
