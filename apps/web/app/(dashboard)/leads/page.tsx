'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Topbar } from '@/components/topbar'

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'won' | 'lost'
type LeadSource = 'walk_in' | 'referral' | 'cold_call' | 'social' | 'website' | 'exhibition' | 'other'

const STATUS_COLORS: Record<LeadStatus, string> = {
  new:           'bg-blue-500/10 text-blue-400',
  contacted:     'bg-yellow-500/10 text-yellow-400',
  qualified:     'bg-purple-500/10 text-purple-400',
  proposal_sent: 'bg-orange-500/10 text-orange-400',
  won:           'bg-green-500/10 text-green-400',
  lost:          'bg-red-500/10 text-red-400',
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

export default function LeadsPage() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const { data: leads = [], isLoading, refetch } = trpc.lead.list.useQuery()
  const createLead = trpc.lead.create.useMutation({
    onSuccess: () => { setOpen(false); setForm(EMPTY_FORM); refetch() },
    onError: (e) => setError(e.message),
  })
  const deleteLead = trpc.lead.delete.useMutation({ onSuccess: () => refetch() })

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
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar breadcrumbs={[{ label: 'Leads' }]} />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100">Leads</h1>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New Lead
          </button>
        </div>

        {isLoading ? (
          <div className="text-zinc-500 text-sm">Loading…</div>
        ) : leads.length === 0 ? (
          <div className="text-zinc-500 text-sm text-center py-16">No leads yet. Add your first lead.</div>
        ) : (
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-wide">
                <tr>
                  {['Name', 'Company', 'Mobile', 'Source', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {leads.map((lead) => (
                  <tr key={lead.id} className="bg-zinc-950 hover:bg-zinc-900 transition-colors">
                    <td className="px-4 py-3 text-zinc-100 font-medium">{lead.name}</td>
                    <td className="px-4 py-3 text-zinc-400">{lead.company ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{lead.mobile ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{lead.source ? SOURCE_LABELS[lead.source as LeadSource] : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[lead.status as LeadStatus] ?? ''}`}>
                        {(lead.status ?? '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteLead.mutate(lead.id)}
                        className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
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
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">New Lead</h2>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <form onSubmit={submit} className="space-y-3">
              {[
                { label: 'Name *', key: 'name', type: 'text', required: true },
                { label: 'Company', key: 'company', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Mobile', key: 'mobile', type: 'tel' },
              ].map(({ label, key, type, required }) => (
                <div key={key}>
                  <label className="block text-xs text-zinc-400 mb-1">{label}</label>
                  <input
                    type={type}
                    required={required}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Source</label>
                <select
                  value={form.source}
                  onChange={e => setForm(f => ({ ...f, source: e.target.value as LeadSource | '' }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="">— Select —</option>
                  {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as LeadStatus }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  {(Object.keys(STATUS_COLORS) as LeadStatus[]).map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-800">
                  Cancel
                </button>
                <button type="submit" disabled={createLead.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg disabled:opacity-50">
                  {createLead.isPending ? 'Saving…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
