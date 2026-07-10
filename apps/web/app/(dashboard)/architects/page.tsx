'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Topbar } from '@/components/topbar'

const EMPTY_FORM = { name: '', firm_name: '', email: '', mobile: '', commission_pct: '', notes: '' }

export default function ArchitectsPage() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const { data: architects = [], isLoading, refetch } = trpc.architect.list.useQuery()
  const createArchitect = trpc.architect.create.useMutation({
    onSuccess: () => { setOpen(false); setForm(EMPTY_FORM); refetch() },
    onError: (e) => setError(e.message),
  })
  const deleteArchitect = trpc.architect.delete.useMutation({ onSuccess: () => refetch() })

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
      <Topbar breadcrumbs={[{ label: 'Architects' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Architects</h1>
          <p className="text-sm text-slate-500 mt-0.5">{architects.length} architect{architects.length !== 1 ? 's' : ''} on file</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Architect
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
          ))}
        </div>
      ) : architects.length === 0 ? (
        <div className="text-sm text-slate-400 text-center py-10">No architects yet. Add your first architect.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
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
                      onClick={() => deleteArchitect.mutate(a.id)}
                      className="text-slate-400 hover:text-red-500 text-xs transition-colors"
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900">New Architect</h2>
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
                  <label className="block text-xs text-slate-500 mb-1">{label}</label>
                  <input
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
                <button type="submit" disabled={createArchitect.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50">
                  {createArchitect.isPending ? 'Saving…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
