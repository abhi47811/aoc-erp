'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'

function StatCard({ label, value, sub, href, loading }: {
  label: string
  value: string | number
  sub?: string
  href?: string
  loading?: boolean
}) {
  const inner = (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-5 hover:border-zinc-600 transition-colors">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      {loading ? (
        <div className="h-8 w-16 bg-zinc-700 animate-pulse rounded mt-2" />
      ) : (
        <p className="text-2xl font-bold text-zinc-100 mt-1">{value}</p>
      )}
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

export default function DashboardPage() {
  const { data: leads = [], isLoading: lLoading } = trpc.lead.list.useQuery()
  const { data: projects = [], isLoading: pLoading } = trpc.project.list.useQuery()
  const { data: workOrders = [], isLoading: wLoading } = trpc.workOrder.list.useQuery()
  const { data: invoices = [], isLoading: iLoading } = trpc.invoice.list.useQuery()
  const { data: deliveries = [], isLoading: dLoading } = trpc.delivery.list.useQuery()
  const { data: qcChecks = [], isLoading: qLoading } = trpc.qc.listChecks.useQuery()

  const leadsList = leads as any[]
  const projectsList = projects as any[]
  const woList = workOrders as any[]
  const invList = invoices as any[]
  const delList = deliveries as any[]
  const qcList = qcChecks as any[]

  // Compute metrics
  const openLeads = leadsList.filter(l => !['won', 'lost', 'closed'].includes(l.status)).length
  const activeProjects = projectsList.filter(p => p.status === 'active').length
  const activeWOs = woList.filter(w => ['in_progress', 'scheduled'].includes(w.status)).length

  const now = new Date()
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const mtdRevenue = invList
    .filter(inv => inv.status === 'paid' && inv.created_at >= mtdStart)
    .reduce((sum: number, inv: any) => sum + parseFloat(inv.amount ?? '0'), 0)

  const pendingDeliveries = delList.filter(d => d.status === 'pending').length
  const pendingQC = qcList.filter(c => c.status === 'pending').length

  // Recent leads (last 5)
  const recentLeads = leadsList.slice(0, 5)

  // Active WOs (top 5 in-progress)
  const activeWOList = woList.filter(w => w.status === 'in_progress').slice(0, 5)

  const loading = lLoading || pLoading || wLoading || iLoading

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">AOC Glass ERP — live overview</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Open Leads" value={openLeads} href="/leads" loading={lLoading} />
        <StatCard label="Active Projects" value={activeProjects} href="/projects" loading={pLoading} />
        <StatCard label="Work Orders" value={activeWOs} sub="in progress" href="/work-orders" loading={wLoading} />
        <StatCard label="MTD Revenue" value={fmt(mtdRevenue)} href="/invoices" loading={iLoading} />
        <StatCard label="Pending Delivery" value={pendingDeliveries} href="/delivery" loading={dLoading} />
        <StatCard label="Pending QC" value={pendingQC} href="/qc" loading={qLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Recent Leads</h3>
            <Link href="/leads" className="text-xs text-zinc-500 hover:text-zinc-300">View all →</Link>
          </div>
          {lLoading && <div className="p-4 text-zinc-500 text-sm">Loading…</div>}
          {!lLoading && recentLeads.length === 0 && (
            <div className="p-6 text-center text-zinc-500 text-sm">No leads yet</div>
          )}
          {recentLeads.length > 0 && (
            <div className="divide-y divide-zinc-700">
              {recentLeads.map((l: any) => (
                <div key={l.id} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-700/30">
                  <div>
                    <div className="text-sm text-zinc-200 font-medium">{l.contact_name}</div>
                    <div className="text-xs text-zinc-500">{l.company_name ?? '—'}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    l.status === 'new' ? 'bg-blue-500/20 text-blue-300' :
                    l.status === 'qualified' ? 'bg-purple-500/20 text-purple-300' :
                    l.status === 'won' ? 'bg-green-500/20 text-green-300' :
                    l.status === 'lost' ? 'bg-red-500/20 text-red-300' :
                    'bg-zinc-700 text-zinc-400'
                  }`}>{l.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Work Orders */}
        <div className="bg-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Active Work Orders</h3>
            <Link href="/work-orders" className="text-xs text-zinc-500 hover:text-zinc-300">View all →</Link>
          </div>
          {wLoading && <div className="p-4 text-zinc-500 text-sm">Loading…</div>}
          {!wLoading && activeWOList.length === 0 && (
            <div className="p-6 text-center text-zinc-500 text-sm">No active work orders</div>
          )}
          {activeWOList.length > 0 && (
            <div className="divide-y divide-zinc-700">
              {activeWOList.map((w: any) => (
                <div key={w.id} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-700/30">
                  <div>
                    <div className="text-sm text-zinc-200 font-mono">{w.number}</div>
                    <div className="text-xs text-zinc-500">{w.clients?.name ?? '—'}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-500/20 text-blue-300">
                    {w.status?.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Quick Access</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: 'New Lead', href: '/leads', color: 'text-blue-400' },
            { label: 'New Quotation', href: '/quotations', color: 'text-purple-400' },
            { label: 'New Invoice', href: '/invoices', color: 'text-green-400' },
            { label: 'New Work Order', href: '/work-orders', color: 'text-amber-400' },
            { label: 'Inventory', href: '/inventory', color: 'text-cyan-400' },
            { label: 'Production', href: '/production', color: 'text-orange-400' },
            { label: 'Reports', href: '/reports', color: 'text-pink-400' },
            { label: 'Admin', href: '/admin', color: 'text-zinc-400' },
          ].map(({ label, href, color }) => (
            <Link key={href} href={href}
              className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg p-3 transition-colors">
              <span className={`text-sm font-medium ${color}`}>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
