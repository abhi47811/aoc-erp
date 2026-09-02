'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { ActivityTimeline } from '@/components/ui/activity-timeline'
import { NotFoundCard } from '@/components/ui/not-found-card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'won' | 'lost'
type LeadSource = 'walk_in' | 'referral' | 'cold_call' | 'social' | 'website' | 'exhibition' | 'other'

const STATUS_COLORS: Record<LeadStatus, string> = {
  new:           'bg-blue-50 text-blue-700 border border-blue-100',
  contacted:     'bg-amber-50 text-amber-700 border border-amber-100',
  qualified:     'bg-violet-50 text-violet-700 border border-violet-100',
  proposal_sent: 'bg-orange-50 text-orange-700 border border-orange-100',
  won:           'bg-emerald-50 text-emerald-700 border border-emerald-100',
  lost:          'bg-red-50 text-red-700 border border-red-100',
}

const SOURCE_LABELS: Record<LeadSource, string> = {
  walk_in: 'Walk-in', referral: 'Referral', cold_call: 'Cold Call',
  social: 'Social Media', website: 'Website', exhibition: 'Exhibition', other: 'Other',
}

type Form = {
  name: string
  company: string
  email: string
  mobile: string
  source: LeadSource | ''
  status: LeadStatus
  notes: string
}

const emptyForm: Form = { name: '', company: '', email: '', mobile: '', source: '', status: 'new', notes: '' }

const inputClass = 'w-full bg-white text-slate-900 px-3.5 py-2.5 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition-colors'
const labelClass = 'text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5'

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const utils = trpc.useUtils()
  const isNew = id === 'new'

  const [form, setForm] = useState<Form>(emptyForm)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: existing, isLoading, isError } = trpc.lead.get.useQuery(id, { enabled: !isNew })
  const create = trpc.lead.create.useMutation({
    onSuccess: (lead) => router.push(`/leads/${lead.id}`),
    onError: (e) => setError(e.message),
  })
  const update = trpc.lead.update.useMutation({
    onSuccess: () => {
      setError('')
      utils.lead.get.invalidate(id)
      utils.lead.list.invalidate()
    },
    onError: (e) => setError(e.message),
  })
  const del = trpc.lead.delete.useMutation({
    onSuccess: () => router.push('/leads'),
    onError: (e) => setDeleteError(e.message),
  })

  useEffect(() => {
    if (existing) {
      const ex = existing as any
      setForm({
        name: ex.name ?? '',
        company: ex.company ?? '',
        email: ex.email ?? '',
        mobile: ex.mobile ?? '',
        source: ex.source ?? '',
        status: ex.status ?? 'new',
        notes: ex.notes ?? '',
      })
    }
  }, [existing])

  const set = (k: keyof Form, v: string) => setForm(p => ({ ...p, [k]: v }))

  function save() {
    setError('')
    const payload = {
      name: form.name,
      company: form.company || undefined,
      email: form.email || undefined,
      mobile: form.mobile || undefined,
      source: form.source || undefined,
      status: form.status,
      notes: form.notes || undefined,
    }
    if (isNew) {
      create.mutate(payload)
    } else {
      update.mutate({ id, data: payload })
    }
  }

  const saving = create.isPending || update.isPending

  if (!isNew && isLoading) {
    return (
      <div className="max-w-2xl space-y-6 animate-fade-in-up">
        <div className="h-6 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!isNew && isError) return <NotFoundCard entity="lead" backHref="/leads" />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/leads"
            aria-label="Back to leads"
            className="p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isNew ? 'New Lead' : (existing as any)?.name}
            </h1>
            {!isNew && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize mt-1 ${STATUS_COLORS[form.status]}`}>
                {form.status.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
        {!isNew && (
          <button
            onClick={() => { setDeleteError(null); setConfirmDelete(true) }}
            aria-label="Delete lead"
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-6 space-y-4 animate-fade-in-up">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Name *</label>
            <input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Contact name" />
          </div>
          <div>
            <label className={labelClass}>Company</label>
            <input className={inputClass} value={form.company} onChange={e => set('company', e.target.value)} placeholder="Company name" />
          </div>
          <div>
            <label className={labelClass}>Mobile</label>
            <input className={inputClass} value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="10-digit mobile" />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@company.com" />
          </div>
          <div>
            <label className={labelClass}>Source</label>
            <select className={inputClass} value={form.source} onChange={e => set('source', e.target.value)}>
              <option value="">— Select source —</option>
              {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select className={inputClass} value={form.status} onChange={e => set('status', e.target.value)}>
              {(Object.keys(STATUS_COLORS) as LeadStatus[]).map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea className={`${inputClass} resize-none`} rows={4} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes about this lead…" />
          </div>
        </div>
      </div>

      {!isNew && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Activity</h2>
          <ActivityTimeline tableName="leads" recordId={id} />
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving || !form.name}
          className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {saving ? 'Saving…' : isNew ? 'Create Lead' : 'Save Changes'}
        </button>
        <Link
          href="/leads"
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Cancel
        </Link>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this lead?"
        description={`This can't be undone. ${(existing as any)?.name} will be permanently removed.`}
        pending={del.isPending}
        error={deleteError}
        onConfirm={() => del.mutate(id)}
        onCancel={() => { setConfirmDelete(false); setDeleteError(null) }}
      />
    </div>
  )
}
