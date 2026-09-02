'use client'

import { useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useDialogA11y } from '@/lib/use-dialog-a11y'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'

type ProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  draft:     'bg-slate-100 text-slate-600',
  active:    'bg-emerald-50 text-emerald-700 border border-emerald-100',
  on_hold:   'bg-amber-50 text-amber-700 border border-amber-100',
  completed: 'bg-blue-50 text-blue-700 border border-blue-100',
  cancelled: 'bg-red-50 text-red-700 border border-red-100',
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
  const deleteProject = trpc.project.delete.useMutation({
    onSuccess: () => { refetch(); setDeleteTarget(null) },
    onError: (e) => setDeleteError(e.message),
  })
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogA11y(open, () => setOpen(false), dialogRef)

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
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Projects</h1>
            <p className="text-sm text-slate-500 mt-0.5">{projects.length} project{projects.length === 1 ? '' : 's'}</p>
          </div>
          <Button onClick={() => setOpen(true)}>
            + New Project
          </Button>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-10">No projects yet. Create your first project.</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Code', 'Name', 'Client', 'Architect', 'Value', 'Status', ''].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider ${h === 'Value' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((p) => {
                  const client = (p as any).clients
                  const arch = (p as any).architects
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.code}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-slate-500">{client?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{arch?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                        {p.estimated_value ? `₹${Number(p.estimated_value).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${STATUS_COLORS[p.status as ProjectStatus] ?? ''}`}>
                          {(p.status ?? '').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteError(null); setDeleteTarget({ id: p.id, label: p.name }) }}
                          className="text-slate-500 hover:text-red-500 text-xs transition-colors"
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

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="new-project-title" className="bg-white border border-slate-200 rounded-2xl shadow-elevation-lg animate-fade-in-up w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 id="new-project-title" className="text-lg font-semibold text-slate-900">New Project</h2>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-project-code" className="block text-xs text-slate-500 mb-1">Code *</label>
                  <input id="new-project-code" required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="P-001"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label htmlFor="new-project-status" className="block text-xs text-slate-500 mb-1">Status</label>
                  <select id="new-project-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    {(Object.keys(STATUS_COLORS) as ProjectStatus[]).map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="new-project-name" className="block text-xs text-slate-500 mb-1">Project Name *</label>
                <input id="new-project-name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="new-project-client" className="block text-xs text-slate-500 mb-1">Client</label>
                <select id="new-project-client" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">— None —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="new-project-architect" className="block text-xs text-slate-500 mb-1">Architect</label>
                <select id="new-project-architect" value={form.architect_id} onChange={e => setForm(f => ({ ...f, architect_id: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">— None —</option>
                  {architects.map(a => <option key={a.id} value={a.id}>{a.name}{a.firm_name ? ` (${a.firm_name})` : ''}</option>)}
                </select>
              </div>
              {[
                { label: 'Site Address', key: 'site_address' },
                { label: 'Estimated Value (₹)', key: 'estimated_value' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label htmlFor={`new-project-${key}`} className="block text-xs text-slate-500 mb-1">{label}</label>
                  <input id={`new-project-${key}`} value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <Button type="submit" disabled={createProject.isPending} className="flex-1">
                  {createProject.isPending ? 'Saving…' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this project?"
        description={`${deleteTarget?.label} will be permanently removed. This can't be undone.`}
        pending={deleteProject.isPending}
        error={deleteError}
        onConfirm={() => deleteTarget && deleteProject.mutate(deleteTarget.id)}
        onCancel={() => { setDeleteTarget(null); setDeleteError(null) }}
      />
    </div>
  )
}
