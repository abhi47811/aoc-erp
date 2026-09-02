'use client'

import { useRef, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDialogA11y } from '@/lib/use-dialog-a11y'

const ROLES = [
  'admin', 'sales_manager', 'salesperson', 'production_manager',
  'production_staff', 'accountant', 'purchase_manager', 'delivery_staff', 'viewer',
] as const

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  sales_manager: 'Sales Manager',
  salesperson: 'Salesperson',
  production_manager: 'Production Manager',
  production_staff: 'Production Staff',
  accountant: 'Accountant',
  purchase_manager: 'Purchase Manager',
  delivery_staff: 'Delivery Staff',
  viewer: 'Viewer',
}

export default function ManagementPage() {
  const { data: users = [], isLoading, refetch } = trpc.user.list.useQuery()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<typeof ROLES[number]>('viewer')
  const [error, setError] = useState('')

  const invite = trpc.user.invite.useMutation({
    onSuccess: () => { setOpen(false); setEmail(''); setRole('viewer'); refetch() },
    onError: (e) => setError(e.message),
  })
  const updateRole = trpc.user.updateRole.useMutation({ onSuccess: () => refetch() })
  const deactivate = trpc.user.deactivate.useMutation({ onSuccess: () => refetch() })
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogA11y(open, () => setOpen(false), dialogRef)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    invite.mutate({ email, role })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Team Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''} on this account</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          + Invite User
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 10}%` }} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['User', 'Role', 'Status', 'Joined', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500 text-sm">No team members yet.</td></tr>
              ) : users.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-800">{u.users?.name ?? '—'}</div>
                    <div className="text-xs text-slate-500">{u.users?.email ?? u.user_id}</div>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === 'owner' ? (
                      <Badge tone="violet">Owner</Badge>
                    ) : (
                      <select
                        value={u.role}
                        onChange={e => updateRole.mutate({ userId: u.user_id, role: e.target.value as any })}
                        className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.is_active ? 'success' : 'neutral'}>
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'owner' && u.is_active && (
                      <button
                        onClick={() => deactivate.mutate({ userId: u.user_id })}
                        className="text-slate-500 hover:text-red-500 text-xs transition-colors"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="invite-user-title" className="bg-white border border-slate-200 rounded-2xl shadow-elevation-lg animate-fade-in-up w-full max-w-md p-6 space-y-4">
            <h2 id="invite-user-title" className="text-lg font-semibold text-slate-900">Invite User</h2>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label htmlFor="invite-user-email" className="block text-xs text-slate-500 mb-1">Email *</label>
                <input
                  id="invite-user-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="invite-user-role" className="block text-xs text-slate-500 mb-1">Role</label>
                <select
                  id="invite-user-role"
                  value={role}
                  onChange={e => setRole(e.target.value as typeof ROLES[number])}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <Button type="submit" disabled={invite.isPending} className="flex-1">
                  {invite.isPending ? 'Sending…' : 'Send Invite'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
