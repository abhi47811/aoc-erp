'use client'

import { useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Topbar } from '@/components/topbar'
import { createClient } from '@/lib/supabase/client'

type Tab = 'drawings' | 'share'

const AI_STATUS_BADGE: Record<string, string> = {
  pending:    'bg-slate-100 text-slate-600',
  processing: 'bg-amber-50 text-amber-700 border border-amber-100',
  done:       'bg-emerald-50 text-emerald-700 border border-emerald-100',
  failed:     'bg-red-50 text-red-700 border border-red-100',
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('drawings')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [shareLabel, setShareLabel] = useState('')
  const [shareDays, setShareDays] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: project, isLoading: pLoading } = trpc.project.get.useQuery(id)
  const { data: drawings = [], refetch: refetchDrawings } = trpc.drawing.list.useQuery(id)
  const { data: tokens = [], refetch: refetchTokens } = trpc.drawing.listShareTokens.useQuery(id)

  const createDrawing    = trpc.drawing.create.useMutation({ onSuccess: () => refetchDrawings() })
  const deleteDrawing    = trpc.drawing.delete.useMutation({ onSuccess: () => refetchDrawings() })
  const getViewUrl       = trpc.drawing.getViewUrl.useMutation()
  const extract          = trpc.drawing.extract.useMutation({ onSuccess: () => refetchDrawings() })
  const createToken      = trpc.drawing.createShareToken.useMutation({ onSuccess: () => refetchTokens() })
  const revokeToken      = trpc.drawing.revokeShareToken.useMutation({ onSuccess: () => refetchTokens() })

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    setUploadError('')
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

      await createDrawing.mutateAsync({
        project_id: id,
        title: file.name.replace(/\.[^.]+$/, ''),
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [id, createDrawing])

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
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar breadcrumbs={[{ label: 'Projects' }, { label: project.name }]} />
      <div className="flex-1 space-y-6">

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
          <h1 className="text-xl font-semibold text-slate-900">{project.name}</h1>
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
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) void handleUpload(f)
                  e.target.value = ''
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {uploading ? 'Uploading…' : '+ Upload Drawing'}
              </button>
              {uploadError && <p className="text-red-600 text-sm">{uploadError}</p>}
            </div>

            {drawings.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-16 border border-slate-200 rounded-xl">
                No drawings yet. Upload a drawing to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {drawings.map((d: any) => (
                  <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
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
                        <p className="text-xs text-slate-500 mb-2">
                          {(d.ai_extracted as any).items?.length ?? 0} items
                          {' · '}
                          {((d.ai_extracted as any).total_area_sqm as number)?.toFixed(2)} m²
                        </p>
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
            <form onSubmit={(e) => void handleCreateToken(e)} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Create Share Link</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Label (optional)</label>
                  <input
                    value={shareLabel}
                    onChange={e => setShareLabel(e.target.value)}
                    placeholder="e.g. Client Review"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
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
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
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
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
    </div>
  )
}
