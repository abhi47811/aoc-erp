'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { inputClass, labelClass } from '@/lib/ui/form-classes'
import { ActivityTimeline } from '@/components/ui/activity-timeline'
import { Button } from '@/components/ui/button'
import { Badge, type Tone } from '@/components/ui/badge'
import { NotFoundCard } from '@/components/ui/not-found-card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'won' | 'lost'
type LeadSource = 'walk_in' | 'referral' | 'cold_call' | 'social' | 'website' | 'exhibition' | 'other'

const STATUS_COLORS: Record<LeadStatus, Tone> = {
  new:           'info',
  contacted:     'warning',
  qualified:     'violet',
  proposal_sent: 'orange',
  won:           'success',
  lost:          'danger',
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
              <Badge tone={STATUS_COLORS[form.status]} className="capitalize mt-1">
                {form.status.replace('_', ' ')}
              </Badge>
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
            <label htmlFor="lead-name" className={labelClass}>Name *</label>
            <input id="lead-name" className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Contact name" />
          </div>
          <div>
            <label htmlFor="lead-company" className={labelClass}>Company</label>
            <input id="lead-company" className={inputClass} value={form.company} onChange={e => set('company', e.target.value)} placeholder="Company name" />
          </div>
          <div>
            <label htmlFor="lead-mobile" className={labelClass}>Mobile</label>
            <input id="lead-mobile" className={inputClass} value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="10-digit mobile" />
          </div>
          <div className="col-span-2">
            <label htmlFor="lead-email" className={labelClass}>Email</label>
            <input id="lead-email" type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@company.com" />
          </div>
          <div>
            <label htmlFor="lead-source" className={labelClass}>Source</label>
            <select id="lead-source" className={inputClass} value={form.source} onChange={e => set('source', e.target.value)}>
              <option value="">— Select source —</option>
              {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="lead-status" className={labelClass}>Status</label>
            <select id="lead-status" className={inputClass} value={form.status} onChange={e => set('status', e.target.value)}>
              {(Object.keys(STATUS_COLORS) as LeadStatus[]).map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label htmlFor="lead-notes" className={labelClass}>Notes</label>
            <textarea id="lead-notes" className={`${inputClass} resize-none`} rows={4} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes about this lead…" />
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
        <Button onClick={save} disabled={saving || !form.name}>
          {saving ? 'Saving…' : isNew ? 'Create Lead' : 'Save Changes'}
        </Button>
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
