'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { NotFoundCard } from '@/components/ui/not-found-card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc'
import { inputClass, labelClass } from '@/lib/ui/form-classes'

type Form = {
  name: string
  firm_name: string
  email: string
  mobile: string
  commission_pct: string
  notes: string
  is_active: boolean
}

const emptyForm: Form = { name: '', firm_name: '', email: '', mobile: '', commission_pct: '', notes: '', is_active: true }


export default function ArchitectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const utils = trpc.useUtils()
  const isNew = id === 'new'

  const [form, setForm] = useState<Form>(emptyForm)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: existing, isLoading, isError } = trpc.architect.get.useQuery(id, { enabled: !isNew })
  const create = trpc.architect.create.useMutation({
    onSuccess: (architect) => router.push(`/architects/${architect.id}`),
    onError: (e) => setError(e.message),
  })
  const update = trpc.architect.update.useMutation({
    onSuccess: () => {
      setError('')
      utils.architect.get.invalidate(id)
      utils.architect.list.invalidate()
    },
    onError: (e) => setError(e.message),
  })
  const del = trpc.architect.delete.useMutation({
    onSuccess: () => router.push('/architects'),
    onError: (e) => setDeleteError(e.message),
  })

  useEffect(() => {
    if (existing) {
      const ex = existing as any
      setForm({
        name: ex.name ?? '',
        firm_name: ex.firm_name ?? '',
        email: ex.email ?? '',
        mobile: ex.mobile ?? '',
        commission_pct: ex.commission_pct != null ? String(ex.commission_pct) : '',
        notes: ex.notes ?? '',
        is_active: ex.is_active ?? true,
      })
    }
  }, [existing])

  const set = (k: keyof Form, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  function save() {
    setError('')
    const payload = {
      name: form.name,
      firm_name: form.firm_name || undefined,
      email: form.email || undefined,
      mobile: form.mobile || undefined,
      commission_pct: form.commission_pct || undefined,
      notes: form.notes || undefined,
      is_active: form.is_active,
    }
    if (isNew) create.mutate(payload)
    else update.mutate({ id, data: payload })
  }

  const saving = create.isPending || update.isPending

  if (!isNew && isLoading) {
    return (
      <div className="max-w-2xl space-y-6 animate-fade-in-up">
        <div className="h-6 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-6 space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!isNew && isError) return <NotFoundCard entity="architect" backHref="/architects" />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/architects" aria-label="Back to architects" className="p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{isNew ? 'New Architect' : (existing as any)?.name}</h1>
            {!isNew && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium mt-1 ${form.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                {form.is_active ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>
        </div>
        {!isNew && (
          <button onClick={() => { setDeleteError(null); setConfirmDelete(true) }} aria-label="Delete architect" className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-6 space-y-4 animate-fade-in-up">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label htmlFor="architect-name" className={labelClass}>Name *</label>
            <input id="architect-name" className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Architect name" />
          </div>
          <div>
            <label htmlFor="architect-firm-name" className={labelClass}>Firm Name</label>
            <input id="architect-firm-name" className={inputClass} value={form.firm_name} onChange={e => set('firm_name', e.target.value)} placeholder="Firm name" />
          </div>
          <div>
            <label htmlFor="architect-mobile" className={labelClass}>Mobile</label>
            <input id="architect-mobile" className={inputClass} value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="10-digit mobile" />
          </div>
          <div>
            <label htmlFor="architect-email" className={labelClass}>Email</label>
            <input id="architect-email" type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@firm.com" />
          </div>
          <div>
            <label htmlFor="architect-commission" className={labelClass}>Commission %</label>
            <input id="architect-commission" type="number" step="0.1" min="0" max="100" className={inputClass} value={form.commission_pct} onChange={e => set('commission_pct', e.target.value)} placeholder="5.0" />
          </div>
          <div className="col-span-2">
            <label htmlFor="architect-notes" className={labelClass}>Notes</label>
            <textarea id="architect-notes" className={`${inputClass} resize-none`} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes about this architect…" />
          </div>
          {!isNew && (
            <label className="col-span-2 flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              Active architect
            </label>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={save} disabled={saving || !form.name}>
          {saving ? 'Saving…' : isNew ? 'Create Architect' : 'Save Changes'}
        </Button>
        <Link href="/architects" className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          Cancel
        </Link>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this architect?"
        description={`This can't be undone. ${(existing as any)?.name} will be permanently removed.`}
        pending={del.isPending}
        error={deleteError}
        onConfirm={() => del.mutate(id)}
        onCancel={() => { setConfirmDelete(false); setDeleteError(null) }}
      />
    </div>
  )
}
