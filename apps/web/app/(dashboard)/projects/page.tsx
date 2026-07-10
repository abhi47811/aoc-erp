'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Topbar } from '@/components/topbar'

type ProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  draft:     'bg-zinc-500/10 text-zinc-400',
  active:    'bg-green-500/10 text-green-400',
  on_hold:   'bg-yellow-500/10 text-yellow-400',
  completed: 'bg-blue-500/10 text-blue-400',
  cancelled: 'bg-red-500/10 text-red-400',
}

const EMPTY_FORM = {
  code: '', name: '', client_id: '', architect_id: '',
  status: 'draft' as ProjectStatus, site_address: '', estimated_value: '', description: '',
}

export default function ProjectsPage() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const { data: projects = [], isLoading, refetch } = trpc.project.list.useQuery()
  const { data: clients = [] } = trpc.clients.list.useQuery()
  const { data: architects = [] } = trpc.architect.list.useQuery()

  const createProject = trpc.project.create.useMutation({
    onSuccess: () => { setOpen(false); setForm(EMPTY_FORM); refetch() },
    onError: (e) => setError(e.message),
  })
  const deleteProject = trpc.project.delete.useMutation({ onSuccess: () => refetch() })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    createProject.mutate({
      code: form.code,
      name: form.name,
      client_id: form.client_id || undefined,
      architect_id: form.architect_id || undefined,
      status: form.status,
      site_address: form.site_address || undefined,
      estimated_value: form.estimated_value || undefined,
      description: form.description || undefined,
    })
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar breadcrumbs={[{ label: 'Projects' }]} />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100">Projects</h1>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New Project
          </button>
        </div>

        {isLoading ? (
          <div className="text-zinc-500 text-sm">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="text-zinc-500 text-sm text-center py-16">No projects yet. Create your first project.</div>
        ) : (
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-wide">
                <tr>
                  {['Code', 'Name', 'Client', 'Architect', 'Value', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {projects.map((p) => {
                  const client = (p as any).clients
                  const arch = (p as any).architects
                  return (
                    <tr key={p.id} className="bg-zinc-950 hover:bg-zinc-900 transition-colors cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
                      <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{p.code}</td>
                      <td className="px-4 py-3 text-zinc-100 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-zinc-400">{client?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-zinc-400">{arch?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-zinc-400">
                        {p.estimated_value ? `₹${Number(p.estimated_value).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[p.status as ProjectStatus] ?? ''}`}>
                          {(p.status ?? '').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteProject.mutate(p.id) }}
                          className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-zinc-100">New Project</h2>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Code *</label>
                  <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="P-001"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500">
                    {(Object.keys(STATUS_COLORS) as ProjectStatus[]).map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Project Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Client</label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500">
                  <option value="">— None —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Architect</label>
                <select value={form.architect_id} onChange={e => setForm(f => ({ ...f, architect_id: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500">
                  <option value="">— None —</option>
                  {architects.map(a => <option key={a.id} value={a.id}>{a.name}{a.firm_name ? ` (${a.firm_name})` : ''}</option>)}
                </select>
              </div>
              {[
                { label: 'Site Address', key: 'site_address' },
                { label: 'Estimated Value (₹)', key: 'estimated_value' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs text-zinc-400 mb-1">{label}</label>
                  <input value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-800">
                  Cancel
                </button>
                <button type="submit" disabled={createProject.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg disabled:opacity-50">
                  {createProject.isPending ? 'Saving…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
