'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { createClient } from '@/lib/supabase/client'

type Tab = 'drawings' | 'share'

type UploadItem = {
  key: string
  name: string
  size: number
  status: 'uploading' | 'done' | 'error'
  error?: string
}

const AI_STATUS_BADGE: Record<string, string> = {
  pending:    'bg-slate-100 text-slate-600',
  processing: 'bg-amber-50 text-amber-700 border border-amber-100',
  done:       'bg-emerald-50 text-emerald-700 border border-emerald-100',
  failed:     'bg-red-50 text-red-700 border border-red-100',
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('drawings')
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [shareLabel, setShareLabel] = useState('')
  const [shareDays, setShareDays] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: project, isLoading: pLoading } = trpc.project.get.useQuery(id)
  const { data: drawings = [], refetch: refetchDrawings } = trpc.drawing.list.useQuery(id)
  const { data: tokens = [], refetch: refetchTokens } = trpc.drawing.listShareTokens.useQuery(id)

  const createDrawing    = trpc.drawing.create.useMutation({ onSuccess: () => refetchDrawings() })
  const deleteDrawing    = trpc.drawing.delete.useMutation({ onSuccess: () => refetchDrawings() })
  const getViewUrl       = trpc.drawing.getViewUrl.useMutation()
  const extract          = trpc.drawing.extract.useMutation({ onSuccess: () => refetchDrawings(), onError: () => refetchDrawings() })
  const createToken      = trpc.drawing.createShareToken.useMutation({ onSuccess: () => refetchTokens() })
  const revokeToken      = trpc.drawing.revokeShareToken.useMutation({ onSuccess: () => refetchTokens() })

  const handleUpload = useCallback(async (file: File) => {
    const key = crypto.randomUUID()
    setUploadQueue(q => [...q, { key, name: file.name, size: file.size, status: 'uploading' }])
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const [, payload] = session.access_token.split('.')
      const claims = JSON.parse(atob(payload!)) as { tenant_id: string }
      const tenantId = claims.tenant_id

      const ext = file.name.split('.').pop() ?? 'bin'
      const fileName = `${crypto.randomUUID()}.${ext}`
      const filePath = `${tenantId}/${id}/${fileName}`

      const { error: uploadErr } = await supabase.storage
        .from('drawings')
        .upload(filePath, file, { contentType: file.type })

      if (uploadErr) throw uploadErr

      const created = await createDrawing.mutateAsync({
        project_id: id,
        title: file.name.replace(/\.[^.]+$/, ''),
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      })

      setUploadQueue(q => q.map(item => item.key === key ? { ...item, status: 'done' } : item))
      if (created?.id) extract.mutate(created.id as string)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setUploadQueue(q => q.map(item => item.key === key ? { ...item, status: 'error', error: message } : item))
    }
  }, [id, createDrawing, extract])

  const handleFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach(file => void handleUpload(file))
  }, [handleUpload])

  const handleView = async (drawingId: string) => {
    const { url } = await getViewUrl.mutateAsync(drawingId)
    window.open(url, '_blank')
  }

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    await createToken.mutateAsync({
      project_id: id,
      label: shareLabel || undefined,
      expires_days: shareDays ? parseInt(shareDays, 10) : undefined,
    })
    setShareLabel('')
    setShareDays('')
  }

  const copyLink = (token: string) => {
    void navigator.clipboard.writeText(`${window.location.origin}/portal/${token}`)
  }

  if (pLoading) {
    return <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading…</div>
  }
  if (!project) {
    return <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Project not found</div>
  }

  return (
    <div className="space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.push('/projects')}
              className="text-slate-500 hover:text-slate-700 text-sm transition-colors"
            >
              ← Back
            </button>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-xs text-slate-500">{project.code}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
          {project.site_address && (
            <p className="text-sm text-slate-500 mt-0.5">{project.site_address}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {(['drawings', 'share'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'share' ? 'Share Links' : 'Drawings'}
            </button>
          ))}
        </div>

        {/* Drawings */}
        {tab === 'drawings' && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={e => { e.preventDefault(); setDragActive(false) }}
              onDrop={e => {
                e.preventDefault()
                setDragActive(false)
                if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
              }}
              className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.dwg,application/dwg,application/acad,application/x-acad,application/autocad_dwg,image/vnd.dwg,drawing/dwg,application/x-dwg"
                className="hidden"
                onChange={e => {
                  if (e.target.files?.length) handleFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              <p className="text-sm font-medium text-slate-600">Drag drawings here or click to browse</p>
              <p className="text-xs text-slate-400">JPG, PNG, GIF, WEBP, PDF or DWG · multiple files supported</p>
            </div>

            {uploadQueue.length > 0 && (
              <div className="space-y-1.5">
                {uploadQueue.map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-slate-700 truncate">{item.name}</span>
                      <span className="text-slate-400 shrink-0">{formatFileSize(item.size)}</span>
                    </div>
                    {item.status === 'uploading' && <span className="text-blue-600 shrink-0">Uploading…</span>}
                    {item.status === 'done' && <span className="text-emerald-600 shrink-0">Uploaded</span>}
                    {item.status === 'error' && <span className="text-red-600 shrink-0 truncate max-w-[50%]">{item.error}</span>}
                  </div>
                ))}
              </div>
            )}

            {drawings.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-16 border border-slate-200 rounded-xl">
                No drawings yet. Upload a drawing to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {drawings.map((d: any) => (
                  <div key={d.id} className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{d.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{d.mime_type ?? '—'}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${AI_STATUS_BADGE[d.ai_status as string] ?? ''}`}>
                          {d.ai_status as string}
                        </span>
                        <button
                          onClick={() => void handleView(d.id as string)}
                          className="text-slate-400 hover:text-blue-600 text-xs transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => extract.mutate(d.id as string)}
                          disabled={extract.isPending || d.ai_status === 'processing'}
                          className="text-slate-400 hover:text-emerald-600 text-xs transition-colors disabled:opacity-40"
                        >
                          Extract AI
                        </button>
                        <button
                          onClick={() => deleteDrawing.mutate(d.id as string)}
                          className="text-slate-400 hover:text-red-500 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {d.ai_status === 'done' && d.ai_extracted && (
                      <div className="border-t border-slate-100 pt-3">
                        {((d.ai_extracted as any).items?.length ?? 0) === 0 ? (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            No glass panel measurements found in this image. It may not be a facade/glazing drawing
                            (e.g. a floor plan or site photo instead), or dimensions may not be clearly labeled —
                            try a clearer image of the elevation/glazing schedule, or enter measurements manually
                            on a new quotation.
                          </p>
                        ) : (
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-slate-500">
                              {(d.ai_extracted as any).items?.length ?? 0} items
                              {' · '}
                              {((d.ai_extracted as any).total_area_sqm as number)?.toFixed(2)} m²
                            </p>
                            <Link
                              href={`/quotations/new?project_id=${id}&drawing_id=${d.id}`}
                              className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
                            >
                              Create Quotation from this Drawing →
                            </Link>
                          </div>
                        )}
                        {((d.ai_extracted as any).items?.length ?? 0) > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                  {['Description', 'Qty', 'W×H (mm)', 'Type', 'Thick.'].map(h => (
                                    <th key={h} className="text-left py-1.5 px-2 font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {((d.ai_extracted as any).items as any[]).map((item, i) => (
                                  <tr key={i} className="text-slate-700">
                                    <td className="py-1.5 px-2">{item.description}</td>
                                    <td className="py-1.5 px-2">{item.qty}</td>
                                    <td className="py-1.5 px-2 font-mono">{item.width_mm}×{item.height_mm}</td>
                                    <td className="py-1.5 px-2">{item.glass_type}</td>
                                    <td className="py-1.5 px-2">{item.thickness_mm ? `${item.thickness_mm}mm` : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {d.ai_status === 'failed' && d.ai_error && (
                      <div className="border-t border-slate-100 pt-2">
                        <p className="text-red-600 text-xs">{d.ai_error as string}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Share Links */}
        {tab === 'share' && (
          <div className="space-y-4">
            <form onSubmit={(e) => void handleCreateToken(e)} className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Create Share Link</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Label (optional)</label>
                  <input
                    value={shareLabel}
                    onChange={e => setShareLabel(e.target.value)}
                    placeholder="e.g. Client Review"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Expires in (days, optional)</label>
                  <input
                    type="number"
                    min="1"
                    value={shareDays}
                    onChange={e => setShareDays(e.target.value)}
                    placeholder="e.g. 30"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={createToken.isPending}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {createToken.isPending ? 'Creating…' : 'Create Link'}
              </button>
            </form>

            {tokens.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-10 border border-slate-200 rounded-xl">
                No share links yet.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Label', 'Created', 'Expires', 'Status', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tokens.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-800 font-medium">{t.label ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {new Date(t.created_at as string).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {t.expires_at ? new Date(t.expires_at as string).toLocaleDateString('en-IN') : 'Never'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                            t.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {t.is_active ? 'Active' : 'Revoked'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {t.is_active && (
                              <button
                                onClick={() => copyLink(t.token as string)}
                                className="text-slate-400 hover:text-blue-600 text-xs transition-colors"
                              >
                                Copy Link
                              </button>
                            )}
                            {t.is_active && (
                              <button
                                onClick={() => revokeToken.mutate(t.id as string)}
                                className="text-slate-400 hover:text-red-500 text-xs transition-colors"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
    </div>
  )
}
