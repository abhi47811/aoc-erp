'use client'

import { useState, useRef } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useDialogA11y } from '@/lib/use-dialog-a11y'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'

const EMPTY_FORM = { name: '', firm_name: '', email: '', mobile: '', commission_pct: '', notes: '' }

const MEDIA_TYPES: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'> = {
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/gif': 'image/gif',
  'image/webp': 'image/webp',
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ArchitectsPage() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const cardInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogA11y(open, () => setOpen(false), dialogRef)

  const { data: architects = [], isLoading, refetch } = trpc.architect.list.useQuery()
  const createArchitect = trpc.architect.create.useMutation({
    onSuccess: () => { setOpen(false); setForm(EMPTY_FORM); refetch() },
    onError: (e) => setError(e.message),
  })
  const deleteArchitect = trpc.architect.delete.useMutation({
    onSuccess: () => { refetch(); setDeleteTarget(null) },
    onError: (e) => setDeleteError(e.message),
  })
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const extractCard = trpc.architect.extractCard.useMutation()

  async function handleCardScan(file: File) {
    setScanning(true)
    setScanError('')
    try {
      const mediaType = MEDIA_TYPES[file.type]
      if (!mediaType) throw new Error('Unsupported image type')
      const imageBase64 = await fileToBase64(file)
      const result = await extractCard.mutateAsync({ imageBase64, mediaType })
      setForm(f => ({
        ...f,
        name: result.name ?? f.name,
        firm_name: result.company ?? f.firm_name,
        email: result.email ?? f.email,
        mobile: result.mobile ?? f.mobile,
      }))
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Card scan failed')
    } finally {
      setScanning(false)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    createArchitect.mutate({
      name: form.name,
      firm_name: form.firm_name || undefined,
      email: form.email || undefined,
      mobile: form.mobile || undefined,
      commission_pct: form.commission_pct || undefined,
      notes: form.notes || undefined,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Architects</h1>
          <p className="text-sm text-slate-500 mt-0.5">{architects.length} architect{architects.length !== 1 ? 's' : ''} on file</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          + New Architect
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
          ))}
        </div>
      ) : architects.length === 0 ? (
        <div className="text-sm text-slate-500 text-center py-10">No architects yet. Add your first architect.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Name', 'Firm', 'Mobile', 'Commission %', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {architects.map((a) => (
                <tr key={a.id} onClick={() => router.push(`/architects/${a.id}`)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium text-slate-900">{a.name}</td>
                  <td className="px-4 py-3 text-slate-800">{a.firm_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-800">{a.mobile ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-800">{a.commission_pct ? `${a.commission_pct}%` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${a.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {a.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteError(null); setDeleteTarget({ id: a.id, label: a.name }) }}
                      className="text-slate-500 hover:text-red-500 text-xs transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="new-architect-title" className="bg-white border border-slate-200 rounded-2xl shadow-elevation-lg animate-fade-in-up w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <h2 id="new-architect-title" className="text-lg font-semibold text-slate-900">New Architect</h2>
              <button type="button" onClick={() => cardInputRef.current?.click()} disabled={scanning}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors">
                {scanning ? 'Scanning…' : '📇 Scan Card'}
              </button>
              <input ref={cardInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" capture="environment" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) void handleCardScan(f); e.target.value = '' }} />
            </div>
            {scanError && <p className="text-red-600 text-sm">{scanError}</p>}
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <form onSubmit={submit} className="space-y-3">
              {[
                { label: 'Name *', key: 'name', required: true },
                { label: 'Firm Name', key: 'firm_name' },
                { label: 'Email', key: 'email' },
                { label: 'Mobile', key: 'mobile' },
                { label: 'Commission %', key: 'commission_pct' },
              ].map(({ label, key, required }) => (
                <div key={key}>
                  <label htmlFor={`architect-${key}`} className="block text-xs text-slate-500 mb-1">{label}</label>
                  <input
                    id={`architect-${key}`}
                    required={required}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <Button type="submit" disabled={createArchitect.isPending} className="flex-1">
                  {createArchitect.isPending ? 'Saving…' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this architect?"
        description={`${deleteTarget?.label} will be permanently removed. This can't be undone.`}
        pending={deleteArchitect.isPending}
        error={deleteError}
        onConfirm={() => deleteTarget && deleteArchitect.mutate(deleteTarget.id)}
        onCancel={() => { setDeleteTarget(null); setDeleteError(null) }}
      />
    </div>
  )
}
