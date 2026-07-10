'use client'

import { useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Topbar } from '@/components/topbar'
import { createClient } from '@/lib/supabase/client'

type Tab = 'drawings' | 'share'

const AI_STATUS_BADGE: Record<string, string> = {
  pending:    'bg-zinc-500/10 text-zinc-400',
  processing: 'bg-yellow-500/10 text-yellow-400',
  done:       'bg-green-500/10 text-green-400',
  failed:     'bg-red-500/10 text-red-400',
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
    return <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Loading…</div>
  }
  if (!project) {
    return <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Project not found</div>
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar breadcrumbs={[{ label: 'Projects' }, { label: project.name }]} />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.push('/projects')}
              className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              ← Back
            </button>
            <span className="text-zinc-700">|</span>
            <span className="font-mono text-xs text-zinc-500">{project.code}</span>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100">{project.name}</h1>
          {project.site_address && (
            <p className="text-zinc-500 text-sm mt-0.5">{project.site_address}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          {(['drawings', 'share'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {uploading ? 'Uploading…' : '+ Upload Drawing'}
              </button>
              {uploadError && <p className="text-red-400 text-sm">{uploadError}</p>}
            </div>

            {drawings.length === 0 ? (
              <div className="text-zinc-500 text-sm text-center py-16 border border-zinc-800 rounded-xl">
                No drawings yet. Upload a drawing to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {drawings.map((d: any) => (
                  <div key={d.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-zinc-100 font-medium truncate">{d.title}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">{d.mime_type ?? '—'}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${AI_STATUS_BADGE[d.ai_status as string] ?? ''}`}>
                          {d.ai_status as string}
                        </span>
                        <button
                          onClick={() => void handleView(d.id as string)}
                          className="text-zinc-400 hover:text-blue-400 text-xs transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => extract.mutate(d.id as string)}
                          disabled={extract.isPending || d.ai_status === 'processing'}
                          className="text-zinc-400 hover:text-green-400 text-xs transition-colors disabled:opacity-40"
                        >
                          Extract AI
                        </button>
                        <button
                          onClick={() => deleteDrawing.mutate(d.id as string)}
                          className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {d.ai_status === 'done' && d.ai_extracted && (
                      <div className="border-t border-zinc-800 pt-3">
                        <p className="text-xs text-zinc-400 mb-2">
                          {(d.ai_extracted as any).items?.length ?? 0} items
                          {' · '}
                          {((d.ai_extracted as any).total_area_sqm as number)?.toFixed(2)} m²
                        </p>
                        {((d.ai_extracted as any).items?.length ?? 0) > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="text-zinc-500">
                                <tr>
                                  {['Description', 'Qty', 'W×H (mm)', 'Type', 'Thick.'].map(h => (
                                    <th key={h} className="text-left py-1 pr-4 font-medium">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800/50">
                                {((d.ai_extracted as any).items as any[]).map((item, i) => (
                                  <tr key={i} className="text-zinc-300">
                                    <td className="py-1 pr-4">{item.description}</td>
                                    <td className="py-1 pr-4">{item.qty}</td>
                                    <td className="py-1 pr-4 font-mono">{item.width_mm}×{item.height_mm}</td>
                                    <td className="py-1 pr-4">{item.glass_type}</td>
                                    <td className="py-1 pr-4">{item.thickness_mm ? `${item.thickness_mm}mm` : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {d.ai_status === 'failed' && d.ai_error && (
                      <div className="border-t border-zinc-800 pt-2">
                        <p className="text-red-400 text-xs">{d.ai_error as string}</p>
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
            <form onSubmit={(e) => void handleCreateToken(e)} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-zinc-300">Create Share Link</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Label (optional)</label>
                  <input
                    value={shareLabel}
                    onChange={e => setShareLabel(e.target.value)}
                    placeholder="e.g. Client Review"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Expires in (days, optional)</label>
                  <input
                    type="number"
                    min="1"
                    value={shareDays}
                    onChange={e => setShareDays(e.target.value)}
                    placeholder="e.g. 30"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={createToken.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {createToken.isPending ? 'Creating…' : 'Create Link'}
              </button>
            </form>

            {tokens.length === 0 ? (
              <div className="text-zinc-500 text-sm text-center py-10 border border-zinc-800 rounded-xl">
                No share links yet.
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-wide">
                    <tr>
                      {['Label', 'Created', 'Expires', 'Status', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {tokens.map((t: any) => (
                      <tr key={t.id} className="bg-zinc-950">
                        <td className="px-4 py-3 text-zinc-300">{t.label ?? '—'}</td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">
                          {new Date(t.created_at as string).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">
                          {t.expires_at ? new Date(t.expires_at as string).toLocaleDateString('en-IN') : 'Never'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.is_active ? 'bg-green-500/10 text-green-400' : 'bg-zinc-500/10 text-zinc-500'
                          }`}>
                            {t.is_active ? 'Active' : 'Revoked'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {t.is_active && (
                              <button
                                onClick={() => copyLink(t.token as string)}
                                className="text-zinc-400 hover:text-blue-400 text-xs transition-colors"
                              >
                                Copy Link
                              </button>
                            )}
                            {t.is_active && (
                              <button
                                onClick={() => revokeToken.mutate(t.id as string)}
                                className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
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
