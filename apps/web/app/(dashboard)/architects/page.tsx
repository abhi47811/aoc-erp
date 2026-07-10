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
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar breadcrumbs={[{ label: 'Architects' }]} />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100">Architects</h1>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New Architect
          </button>
        </div>

        {isLoading ? (
          <div className="text-zinc-500 text-sm">Loading…</div>
        ) : architects.length === 0 ? (
          <div className="text-zinc-500 text-sm text-center py-16">No architects yet. Add your first architect.</div>
        ) : (
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-wide">
                <tr>
                  {['Name', 'Firm', 'Mobile', 'Commission %', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {architects.map((a) => (
                  <tr key={a.id} className="bg-zinc-950 hover:bg-zinc-900 transition-colors">
                    <td className="px-4 py-3 text-zinc-100 font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-zinc-400">{a.firm_name ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{a.mobile ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{a.commission_pct ? `${a.commission_pct}%` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.is_active ? 'bg-green-500/10 text-green-400' : 'bg-zinc-500/10 text-zinc-500'}`}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteArchitect.mutate(a.id)}
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
            <h2 className="text-lg font-semibold text-zinc-100">New Architect</h2>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <form onSubmit={submit} className="space-y-3">
              {[
                { label: 'Name *', key: 'name', required: true },
                { label: 'Firm Name', key: 'firm_name' },
                { label: 'Email', key: 'email' },
                { label: 'Mobile', key: 'mobile' },
                { label: 'Commission %', key: 'commission_pct' },
              ].map(({ label, key, required }) => (
                <div key={key}>
                  <label className="block text-xs text-zinc-400 mb-1">{label}</label>
                  <input
                    required={required}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-800">
                  Cancel
                </button>
                <button type="submit" disabled={createArchitect.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg disabled:opacity-50">
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
