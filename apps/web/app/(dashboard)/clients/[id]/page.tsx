'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { ActivityTimeline } from '@/components/ui/activity-timeline'
import { NotFoundCard } from '@/components/ui/not-found-card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type Form = {
  name: string
  contact_person: string
  email: string
  mobile: string
  gstin: string
  billing_address: string
  notes: string
  is_active: boolean
}

const emptyForm: Form = {
  name: '', contact_person: '', email: '', mobile: '',
  gstin: '', billing_address: '', notes: '', is_active: true,
}

const inputClass = 'w-full bg-white text-slate-900 px-3.5 py-2.5 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500 transition-colors'
const labelClass = 'text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const utils = trpc.useUtils()
  const isNew = id === 'new'

  const [form, setForm] = useState<Form>(emptyForm)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: existing, isLoading, isError } = trpc.clients.get.useQuery(id, { enabled: !isNew })
  const create = trpc.clients.create.useMutation({
    onSuccess: (client) => router.push(`/clients/${client.id}`),
    onError: (e) => setError(e.message),
  })
  const update = trpc.clients.update.useMutation({
    onSuccess: () => {
      setError('')
      utils.clients.get.invalidate(id)
      utils.clients.list.invalidate()
    },
    onError: (e) => setError(e.message),
  })
  const del = trpc.clients.delete.useMutation({
    onSuccess: () => router.push('/clients'),
    onError: (e) => setDeleteError(e.message),
  })

  useEffect(() => {
    if (existing) {
      const ex = existing as any
      setForm({
        name: ex.name ?? '',
        contact_person: ex.contact_person ?? '',
        email: ex.email ?? '',
        mobile: ex.mobile ?? '',
        gstin: ex.gstin ?? '',
        billing_address: ex.billing_address ?? '',
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
      contact_person: form.contact_person || undefined,
      email: form.email || undefined,
      mobile: form.mobile || undefined,
      gstin: form.gstin || undefined,
      billing_address: form.billing_address || undefined,
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

  if (!isNew && isError) return <NotFoundCard entity="client" backHref="/clients" />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/clients" aria-label="Back to clients" className="p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{isNew ? 'New Client' : (existing as any)?.name}</h1>
            {!isNew && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium mt-1 ${form.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                {form.is_active ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>
        </div>
        {!isNew && (
          <button onClick={() => { setDeleteError(null); setConfirmDelete(true) }} aria-label="Delete client" className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-6 space-y-4 animate-fade-in-up">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label htmlFor="client-name" className={labelClass}>Company Name *</label>
            <input id="client-name" className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Company name" />
          </div>
          <div>
            <label htmlFor="client-contact-person" className={labelClass}>Contact Person</label>
            <input id="client-contact-person" className={inputClass} value={form.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Primary contact" />
          </div>
          <div>
            <label htmlFor="client-mobile" className={labelClass}>Mobile</label>
            <input id="client-mobile" className={inputClass} value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="10-digit mobile" />
          </div>
          <div>
            <label htmlFor="client-email" className={labelClass}>Email</label>
            <input id="client-email" type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@company.com" />
          </div>
          <div>
            <label htmlFor="client-gstin" className={labelClass}>GSTIN</label>
            <input id="client-gstin" className={`${inputClass} font-mono`} value={form.gstin} onChange={e => set('gstin', e.target.value)} placeholder="22AAAAA0000A1Z5" />
          </div>
          <div className="col-span-2">
            <label htmlFor="client-billing-address" className={labelClass}>Billing Address</label>
            <textarea id="client-billing-address" className={`${inputClass} resize-none`} rows={2} value={form.billing_address} onChange={e => set('billing_address', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label htmlFor="client-notes" className={labelClass}>Notes</label>
            <textarea id="client-notes" className={`${inputClass} resize-none`} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes about this client…" />
          </div>
          {!isNew && (
            <label className="col-span-2 flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              Active client
            </label>
          )}
        </div>
      </div>

      {!isNew && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Activity</h2>
          <ActivityTimeline tableName="clients" recordId={id} />
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving || !form.name}
          className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {saving ? 'Saving…' : isNew ? 'Create Client' : 'Save Changes'}
        </button>
        <Link href="/clients" className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          Cancel
        </Link>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this client?"
        description={`This can't be undone. ${(existing as any)?.name} will be permanently removed.`}
        pending={del.isPending}
        error={deleteError}
        onConfirm={() => del.mutate(id)}
        onCancel={() => { setConfirmDelete(false); setDeleteError(null) }}
      />
    </div>
  )
}
