'use client'

import { useState, useRef } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useDialogA11y } from '@/lib/use-dialog-a11y'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { MultiSelectFilter } from '@/components/ui/multi-select-filter'

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
  walk_in:    'Walk-in',
  referral:   'Referral',
  cold_call:  'Cold Call',
  social:     'Social Media',
  website:    'Website',
  exhibition: 'Exhibition',
  other:      'Other',
}

const EMPTY_FORM = { name: '', company: '', email: '', mobile: '', source: '' as LeadSource | '', status: 'new' as LeadStatus, notes: '' }

const STATUS_OPTIONS = (Object.keys(STATUS_COLORS) as LeadStatus[]).map(s => ({
  value: s,
  label: s.split('_').map(w => (w.charAt(0).toUpperCase() + w.slice(1))).join(' '),
}))

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

export default function LeadsPage() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const cardInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogA11y(open, () => setOpen(false), dialogRef)

  const { data: leads = [], isLoading, refetch } = trpc.lead.list.useQuery()
  const filteredLeads = leads.filter(l => selectedStatuses.length === 0 || selectedStatuses.includes(l.status ?? ''))
  const createLead = trpc.lead.create.useMutation({
    onSuccess: () => { setOpen(false); setForm(EMPTY_FORM); refetch() },
    onError: (e) => setError(e.message),
  })
  const deleteLead = trpc.lead.delete.useMutation({
    onSuccess: () => { refetch(); setDeleteTarget(null) },
    onError: (e) => setDeleteError(e.message),
  })
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const extractCard = trpc.lead.extractCard.useMutation()

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
        company: result.company ?? f.company,
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
    createLead.mutate({
      name: form.name,
      company: form.company || undefined,
      email: form.email || undefined,
      mobile: form.mobile || undefined,
      source: form.source || undefined,
      status: form.status,
      notes: form.notes || undefined,
    })
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leads</h1>
            <p className="text-sm text-slate-500 mt-0.5">{filteredLeads.length} total lead{filteredLeads.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => setOpen(true)}>
            + New Lead
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <MultiSelectFilter label="Status" options={STATUS_OPTIONS} selected={selectedStatuses} onChange={setSelectedStatuses} />
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 10}%` }} />
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-sm text-slate-500">
            No leads yet. Add your first lead.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  {['Name', 'Company', 'Mobile', 'Source', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3.5 font-medium text-slate-900">{lead.name}</td>
                    <td className="px-4 py-3.5 text-slate-500">{lead.company ?? '—'}</td>
                    <td className="px-4 py-3.5 text-slate-500">{lead.mobile ?? '—'}</td>
                    <td className="px-4 py-3.5 text-slate-500">{lead.source ? SOURCE_LABELS[lead.source as LeadSource] : '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${STATUS_COLORS[lead.status as LeadStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                        {(lead.status ?? '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteError(null); setDeleteTarget({ id: lead.id, label: lead.name }) }}
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="new-lead-title" className="bg-white border border-slate-200 rounded-2xl shadow-elevation-lg animate-fade-in-up w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="new-lead-title" className="text-base font-semibold text-slate-900">New Lead</h2>
              <button
                type="button"
                onClick={() => cardInputRef.current?.click()}
                disabled={scanning}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
              >
                {scanning ? 'Scanning…' : '📇 Scan Business Card'}
              </button>
              <input
                ref={cardInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                capture="environment"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) void handleCardScan(f)
                  e.target.value = ''
                }}
              />
            </div>
            {scanError && <p className="text-red-600 text-sm">{scanError}</p>}
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <form onSubmit={submit} className="space-y-3">
              {[
                { label: 'Name *', key: 'name', type: 'text', required: true },
                { label: 'Company', key: 'company', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Mobile', key: 'mobile', type: 'tel' },
              ].map(({ label, key, type, required }) => (
                <div key={key}>
                  <label htmlFor={`lead-${key}`} className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                  <input
                    id={`lead-${key}`}
                    type={type}
                    required={required}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
              <div>
                <label htmlFor="lead-source" className="block text-sm font-medium text-slate-700 mb-1.5">Source</label>
                <select
                  id="lead-source"
                  value={form.source}
                  onChange={e => setForm(f => ({ ...f, source: e.target.value as LeadSource | '' }))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">— Select source —</option>
                  {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="lead-status" className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select
                  id="lead-status"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as LeadStatus }))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {(Object.keys(STATUS_COLORS) as LeadStatus[]).map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <Button type="submit" disabled={createLead.isPending} className="flex-1">
                  {createLead.isPending ? 'Saving…' : 'Create Lead'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this lead?"
        description={`${deleteTarget?.label} will be permanently removed. This can't be undone.`}
        pending={deleteLead.isPending}
        error={deleteError}
        onConfirm={() => deleteTarget && deleteLead.mutate(deleteTarget.id)}
        onCancel={() => { setDeleteTarget(null); setDeleteError(null) }}
      />
    </div>
  )
}

