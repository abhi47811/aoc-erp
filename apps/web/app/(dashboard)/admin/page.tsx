'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'

type Tenant = {
  id: string
  name: string
  plan: string
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
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">System Admin</h1>
        <p className="text-zinc-400 text-sm mt-1">Platform health and tenant management</p>
      </div>

      {/* Health */}
      <section>
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">System Health</h2>
        {health ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${health.status === 'healthy' ? 'bg-green-500' : 'bg-amber-500'}`} />
                <p className="text-zinc-100 font-semibold capitalize">{String(health.status)}</p>
              </div>
            </div>
            <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Database</p>
              {health.checks && typeof health.checks === 'object' ? (
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${(health.checks as any).database?.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <p className="text-zinc-100 font-semibold">
                    {(health.checks as any).database?.latencyMs ?? '—'}ms
                  </p>
                </div>
              ) : null}
            </div>
            <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Uptime</p>
              <p className="text-zinc-100 font-semibold">
                {health.uptime ? `${Math.floor(Number(health.uptime) / 3600)}h ${Math.floor((Number(health.uptime) % 3600) / 60)}m` : '—'}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-24 bg-zinc-800 rounded-xl border border-zinc-700 animate-pulse" />
        )}
      </section>

      {/* Tenants */}
      <section>
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">Tenants</h2>
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700">
                {['Tenant', 'Plan', 'Status', 'Users', 'Created'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenantsQuery.isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Loading...</td></tr>
              ) : tenantsQuery.data?.map((t: Tenant) => (
                <tr key={t.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/20">
                  <td className="px-4 py-3 text-zinc-100 font-medium">{t.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium capitalize">{t.plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      t.status === 'active' ? 'bg-green-500/10 text-green-400' :
                      t.status === 'trialing' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{t.users}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
