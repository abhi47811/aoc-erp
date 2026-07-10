'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Topbar } from '@/components/topbar'

const EMPTY_FORM = { name: '', contact_person: '', email: '', mobile: '', gstin: '', address: '', notes: '' }

export default function SuppliersPage() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const { data: suppliers = [], isLoading, refetch } = trpc.supplier.list.useQuery()
  const createSupplier = trpc.supplier.create.useMutation({
    onSuccess: () => { setOpen(false); setForm(EMPTY_FORM); refetch() },
    onError: (e) => setError(e.message),
  })
  const deleteSupplier = trpc.supplier.delete.useMutation({ onSuccess: () => refetch() })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    createSupplier.mutate({
      name: form.name,
      contact_person: form.contact_person || undefined,
      email: form.email || undefined,
      mobile: form.mobile || undefined,
      gstin: form.gstin || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
    })
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar breadcrumbs={[{ label: 'Suppliers' }]} />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100">Suppliers</h1>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New Supplier
          </button>
        </div>

        {isLoading ? (
          <div className="text-zinc-500 text-sm">Loading…</div>
        ) : suppliers.length === 0 ? (
          <div className="text-zinc-500 text-sm text-center py-16">No suppliers yet. Add your first supplier.</div>
        ) : (
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-wide">
                <tr>
                  {['Name', 'Contact', 'Mobile', 'GSTIN', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {suppliers.map((s) => (
                  <tr key={s.id} className="bg-zinc-950 hover:bg-zinc-900 transition-colors">
                    <td className="px-4 py-3 text-zinc-100 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-zinc-400">{s.contact_person ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{s.mobile ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{s.gstin ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-500/10 text-green-400' : 'bg-zinc-500/10 text-zinc-500'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteSupplier.mutate(s.id)}
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
            <h2 className="text-lg font-semibold text-zinc-100">New Supplier</h2>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <form onSubmit={submit} className="space-y-3">
              {[
                { label: 'Name *', key: 'name', required: true },
                { label: 'Contact Person', key: 'contact_person' },
                { label: 'Email', key: 'email' },
                { label: 'Mobile', key: 'mobile' },
                { label: 'GSTIN', key: 'gstin' },
                { label: 'Address', key: 'address' },
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
                <button type="submit" disabled={createSupplier.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg disabled:opacity-50">
                  {createSupplier.isPending ? 'Saving…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
