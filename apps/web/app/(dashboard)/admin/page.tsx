'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge } from '@/components/ui/badge'

type Tenant = {
  id: string
  name: string
  status: string
  users: number
  created_at: string
}

export default function AdminPage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(setHealth)
  }, [])

  const tenantsQuery = trpc.admin.tenants.useQuery()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Admin</h1>
        <p className="text-sm text-slate-500 mt-0.5">Platform health and tenant management</p>
      </div>

      {/* Health */}
      <section>
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">System Health</h2>
        {health ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${health.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <p className="text-slate-900 font-semibold capitalize">{String(health.status)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Database</p>
              {health.checks && typeof health.checks === 'object' ? (
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${(health.checks as any).database?.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <p className="text-slate-900 font-semibold tabular-nums">
                    {(health.checks as any).database?.latencyMs ?? '—'}ms
                  </p>
                </div>
              ) : null}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Uptime</p>
              <p className="text-slate-900 font-semibold tabular-nums">
                {health.uptime ? `${Math.floor(Number(health.uptime) / 3600)}h ${Math.floor((Number(health.uptime) % 3600) / 60)}m` : '—'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5">
                <div className="h-3 w-16 bg-slate-100 animate-pulse rounded mb-2" />
                <div className="h-5 w-20 bg-slate-100 animate-pulse rounded" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tenants */}
      <section>
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Tenants</h2>
        {tenantsQuery.isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Tenant', 'Status', 'Users', 'Created'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenantsQuery.isError ? (
                  <tr><td colSpan={4} className="text-center py-10 text-sm text-red-600">Couldn&apos;t load tenants. Try refreshing.</td></tr>
                ) : tenantsQuery.data?.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 text-sm text-slate-500">No tenants found</td></tr>
                ) : tenantsQuery.data?.map((t: Tenant) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{t.name}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className="capitalize"
                        tone={
                          t.status === 'active' ? 'success' :
                          t.status === 'trialing' ? 'warning' :
                          'danger'
                        }
                      >{t.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 tabular-nums">{t.users}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
