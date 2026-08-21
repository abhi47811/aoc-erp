'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { createClient } from '@/lib/supabase/client'

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-slate-100 text-slate-600 border border-slate-200',
  processing: 'bg-blue-50 text-blue-700 border border-blue-100',
  done:       'bg-emerald-50 text-emerald-700 border border-emerald-100',
  failed:     'bg-red-50 text-red-700 border border-red-100',
}

type Drawing = {
  id: string
  title: string
  ai_status: string | null
  ai_extracted: unknown
  ai_error?: string | null
  mime_type: string | null
  created_at: string
  project_id: string
  projects: { code: string; name: string } | null
}

type ExtractedItem = {
  description: string
  qty: number
  width_mm: number
  height_mm: number
  glass_type: string
  thickness_mm: number | null
  notes: string | null
}

type ExtractionResult = {
  items: ExtractedItem[]
  total_area_sqm: number
  drawing_ref: string | null
}

function fmtDim(mm: number) {
  return mm >= 1000 ? `${(mm / 1000).toFixed(2)}m` : `${mm}mm`
}

export default function DrawingsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive]       = useState(false)
  const [showUpload, setShowUpload]       = useState(false)
  const [uploadProject, setUploadProject] = useState('')
  const [uploadQueue, setUploadQueue]     = useState<Array<{ key: string; name: string; status: string; error?: string }>>([])
  const [expanded, setExpanded]           = useState<Set<string>>(new Set())

  const { data: drawings = [], isLoading, refetch } = trpc.drawing.listAll.useQuery(
    undefined,
    { refetchInterval: (q) => q.state.data?.some((d: any) => d.ai_status === 'processing') ? 3000 : false }
  )
  const { data: projects = [] } = trpc.project.list.useQuery({})

  const createDrawing = trpc.drawing.create.useMutation()
  const extract       = trpc.drawing.extract.useMutation({ onSettled: () => void refetch() })
  const del           = trpc.drawing.delete.useMutation({ onSuccess: () => void refetch() })
  const getViewUrl    = trpc.drawing.getViewUrl.useMutation()

  const handleUpload = useCallback(async (file: File) => {
    if (!uploadProject) return
    const key = crypto.randomUUID()
    setUploadQueue(q => [...q, { key, name: file.name, status: 'uploading' }])
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const [, payload] = session.access_token.split('.')
      const claims = JSON.parse(atob(payload!)) as { tenant_id: string }

      const ext      = file.name.split('.').pop() ?? 'bin'
      const filePath = `${claims.tenant_id}/${uploadProject}/${crypto.randomUUID()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('drawings').upload(filePath, file, { contentType: file.type })
      if (uploadErr) throw uploadErr

      const created = await createDrawing.mutateAsync({
        project_id: uploadProject,
        title:      file.name.replace(/\.[^.]+$/, ''),
        file_path:  filePath,
        file_size:  file.size,
        mime_type:  file.type,
      })

      setUploadQueue(q => q.map(i => i.key === key ? { ...i, status: 'extracting' } : i))
      if (created?.id) {
        await extract.mutateAsync(created.id as string)
        setUploadQueue(q => q.map(i => i.key === key ? { ...i, status: 'done' } : i))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setUploadQueue(q => q.map(i => i.key === key ? { ...i, status: 'error', error: message } : i))
    }
  }, [uploadProject, createDrawing, extract])

  const handleFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(f => void handleUpload(f))
  }

  const handleView = async (id: string) => {
    const { url } = await getViewUrl.mutateAsync(id)
    window.open(url, '_blank')
  }

  const toggleExpand = (id: string) => {
    setExpanded(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const closeUpload = () => {
    setShowUpload(false)
    setUploadQueue([])
    setUploadProject('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Drawings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {drawings.length} drawing{drawings.length !== 1 ? 's' : ''} across all projects
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px"
        >
          Upload Drawing
        </button>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-lg animate-fade-in-up w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Upload Drawing</h2>
              <button onClick={closeUpload} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Project *</label>
              <select
                value={uploadProject}
                onChange={e => setUploadProject(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select project…</option>
                {(projects as any[]).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
                ))}
              </select>
            </div>

            <div
              onClick={() => uploadProject && fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={e => { e.preventDefault(); setDragActive(false) }}
              onDrop={e => {
                e.preventDefault(); setDragActive(false)
                if (uploadProject) handleFiles(e.dataTransfer.files)
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                uploadProject
                  ? dragActive
                    ? 'border-blue-400 bg-blue-50 cursor-copy'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 cursor-pointer'
                  : 'border-slate-200 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="text-2xl mb-2">📄</div>
              <p className="text-sm text-slate-600">
                {uploadProject ? 'Drop files here or click to browse' : 'Select a project first'}
              </p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, PDF accepted</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={e => e.target.files && handleFiles(e.target.files)}
            />

            {uploadQueue.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {uploadQueue.map(item => (
                  <div key={item.key} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.status === 'done'       ? 'bg-emerald-500' :
                      item.status === 'error'      ? 'bg-red-500' :
                      item.status === 'extracting' ? 'bg-blue-500 animate-pulse' :
                                                     'bg-amber-400 animate-pulse'
                    }`} />
                    <span className="truncate text-slate-700 flex-1">{item.name}</span>
                    <span className="text-slate-400 text-xs flex-shrink-0">
                      {item.status === 'uploading'  ? 'uploading…'  :
                       item.status === 'extracting' ? 'extracting…' :
                       item.status === 'done'       ? 'done'        :
                       item.error ?? 'error'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {uploadQueue.length > 0 && uploadQueue.every(i => i.status === 'done' || i.status === 'error') && (
              <button
                onClick={closeUpload}
                className="w-full py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
          ))}
        </div>
      ) : drawings.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs py-20 text-center">
          <div className="text-4xl mb-3">📐</div>
          <p className="text-sm font-medium text-slate-600">No drawings yet</p>
          <p className="text-xs text-slate-400 mt-1">Upload a drawing to extract glass measurements automatically</p>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-4 px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px"
          >
            Upload first drawing
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['', 'Title', 'Project', 'AI Status', 'Type', 'Uploaded', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(drawings as unknown as Drawing[]).flatMap(d => {
                const isExpanded = expanded.has(d.id)
                const extracted  = d.ai_extracted as ExtractionResult | null
                const hasItems   = !!(extracted?.items && extracted.items.length > 0)
                const isProc     = d.ai_status === 'processing'

                const mainRow = (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="pl-4 pr-1 py-3 w-6">
                      {hasItems && (
                        <button
                          onClick={() => toggleExpand(d.id)}
                          className="text-slate-400 hover:text-slate-700 transition-colors text-xs w-4 text-center"
                          title={isExpanded ? 'Collapse measurements' : 'View measurements'}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{d.title}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {d.projects ? (
                        <Link href={`/projects/${d.project_id}`} className="text-blue-600 hover:text-blue-700">
                          {d.projects.code} · {d.projects.name}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium capitalize ${STATUS_COLORS[d.ai_status ?? 'pending'] ?? STATUS_COLORS.pending}`}>
                        {isProc && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
                        {d.ai_status ?? 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{d.mime_type ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => void handleView(d.id)}
                          className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          View
                        </button>
                        {(d.ai_status === 'pending' || d.ai_status === 'failed') && (
                          <button
                            onClick={() => extract.mutate(d.id)}
                            disabled={extract.isPending}
                            className="text-xs text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                          >
                            Extract
                          </button>
                        )}
                        {d.ai_status === 'done' && (
                          <button
                            onClick={() => extract.mutate(d.id)}
                            disabled={extract.isPending}
                            className="text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                          >
                            Re-extract
                          </button>
                        )}
                        {d.ai_status === 'done' && hasItems && (
                          <button
                            onClick={() => router.push(`/quotations/new?project_id=${d.project_id}&drawing_id=${d.id}`)}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-800 transition-colors"
                          >
                            → Quotation
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm('Delete this drawing?')) del.mutate(d.id) }}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )

                if (!isExpanded || !hasItems) return [mainRow]

                const expandedRow = (
                  <tr key={`${d.id}-exp`}>
                    <td colSpan={7} className="px-6 pb-5 bg-slate-50/60 border-b border-slate-100">
                      <div className="pt-3 space-y-3">
                        {extracted!.drawing_ref && (
                          <p className="text-xs text-slate-500">
                            Drawing ref: <span className="font-mono font-medium text-slate-700">{extracted!.drawing_ref}</span>
                          </p>
                        )}

                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-white border-b border-slate-100">
                              <tr>
                                {['#', 'Description', 'Qty', 'Width', 'Height', 'Glass Type', 'Thickness', 'Notes'].map(h => (
                                  <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {extracted!.items.map((item, i) => (
                                <tr key={i} className="bg-white hover:bg-slate-50">
                                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                                  <td className="px-3 py-2 font-medium text-slate-800">{item.description}</td>
                                  <td className="px-3 py-2 text-slate-600">{item.qty}</td>
                                  <td className="px-3 py-2 text-slate-600">{fmtDim(item.width_mm)}</td>
                                  <td className="px-3 py-2 text-slate-600">{fmtDim(item.height_mm)}</td>
                                  <td className="px-3 py-2 text-slate-600">{item.glass_type || '—'}</td>
                                  <td className="px-3 py-2 text-slate-600">{item.thickness_mm ? `${item.thickness_mm}mm` : '—'}</td>
                                  <td className="px-3 py-2 text-slate-400">{item.notes || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500">
                            Total area: <span className="font-semibold text-slate-700">{extracted!.total_area_sqm.toFixed(2)} m²</span>
                            {' · '}{extracted!.items.length} item{extracted!.items.length !== 1 ? 's' : ''}
                          </p>
                          <button
                            onClick={() => router.push(`/quotations/new?project_id=${d.project_id}&drawing_id=${d.id}`)}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            Create Quotation from Drawing
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )

                return [mainRow, expandedRow]
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
