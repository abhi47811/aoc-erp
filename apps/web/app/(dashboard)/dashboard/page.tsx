'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import {
  Users, FolderKanban, ClipboardList, IndianRupee,
  Truck, CheckSquare, ArrowRight,
} from 'lucide-react'

function StatCard({ label, value, sub, href, loading, icon: Icon }: {
  label: string
  value: string | number
  sub?: string
  href?: string
  loading?: boolean
  icon?: React.ComponentType<{ size?: number; className?: string }>
}) {
  const inner = (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all group">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
            <Icon size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
          </div>
        )}
      </div>
      {loading ? (
        <div className="h-7 w-16 bg-slate-100 animate-pulse rounded-md mt-1" />
      ) : (
        <p className="text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
      )}
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new:       'bg-blue-50 text-blue-700 border border-blue-100',
    qualified: 'bg-violet-50 text-violet-700 border border-violet-100',
    won:       'bg-emerald-50 text-emerald-700 border border-emerald-100',
    lost:      'bg-red-50 text-red-700 border border-red-100',
    in_progress: 'bg-amber-50 text-amber-700 border border-amber-100',
    scheduled: 'bg-sky-50 text-sky-700 border border-sky-100',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

const QUICK_LINKS = [
  { label: 'New Lead',       href: '/leads' },
  { label: 'New Quotation',  href: '/quotations' },
  { label: 'New Invoice',    href: '/invoices' },
  { label: 'New Work Order', href: '/work-orders' },
  { label: 'Inventory',      href: '/inventory' },
  { label: 'Production',     href: '/production' },
  { label: 'Reports',        href: '/reports' },
  { label: 'Admin',          href: '/admin' },
]

export default function DashboardPage() {
  const { data: leads = [],      isLoading: lLoading } = trpc.lead.list.useQuery()
  const { data: projects = [],   isLoading: pLoading } = trpc.project.list.useQuery()
  const { data: workOrders = [], isLoading: wLoading } = trpc.workOrder.list.useQuery()
  const { data: invoices = [],   isLoading: iLoading } = trpc.invoice.list.useQuery()
  const { data: deliveries = [], isLoading: dLoading } = trpc.delivery.list.useQuery()
  const { data: qcChecks = [],   isLoading: qLoading } = trpc.qc.listChecks.useQuery()

  const leadsList    = leads      as any[]
  const projectsList = projects   as any[]
  const woList       = workOrders as any[]
  const invList      = invoices   as any[]
  const delList      = deliveries as any[]
  const qcList       = qcChecks   as any[]

  const openLeads     = leadsList.filter(l => !['won','lost','closed'].includes(l.status)).length
  const activeProjects = projectsList.filter(p => p.status === 'active').length
  const activeWOs     = woList.filter(w => ['in_progress','scheduled'].includes(w.status)).length

  const now       = new Date()
  const mtdStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const mtdRevenue = invList
    .filter(inv => inv.status === 'paid' && inv.created_at >= mtdStart)
    .reduce((sum: number, inv: any) => sum + parseFloat(inv.amount ?? '0'), 0)

  const pendingDeliveries = delList.filter(d => d.status === 'pending').length
  const pendingQC         = qcList.filter(c => c.status === 'pending').length

  const recentLeads  = leadsList.slice(0, 5)
  const activeWOList = woList.filter(w => w.status === 'in_progress').slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">AOC Glass ERP — live overview</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Users}        label="Open Leads"       value={openLeads}           href="/leads"       loading={lLoading} />
        <StatCard icon={FolderKanban} label="Active Projects"  value={activeProjects}       href="/projects"    loading={pLoading} />
        <StatCard icon={ClipboardList}label="Work Orders"      value={activeWOs}  sub="in progress" href="/work-orders" loading={wLoading} />
        <StatCard icon={IndianRupee}  label="MTD Revenue"      value={fmt(mtdRevenue)}     href="/invoices"    loading={iLoading} />
        <StatCard icon={Truck}        label="Pending Delivery" value={pendingDeliveries}    href="/delivery"    loading={dLoading} />
        <StatCard icon={CheckSquare}  label="Pending QC"       value={pendingQC}            href="/qc"          loading={qLoading} />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Recent Leads</h3>
            <Link href="/leads" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {lLoading && (
            <div className="p-5 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-slate-100 animate-pulse rounded-md" style={{ width: `${70 - i * 10}%` }} />
              ))}
            </div>
          )}
          {!lLoading && recentLeads.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-400">No leads yet</div>
          )}
          {recentLeads.length > 0 && (
            <div className="divide-y divide-slate-100">
              {recentLeads.map((l: any) => (
                <div key={l.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{l.contact_name}</div>
                    <div className="text-xs text-slate-400 truncate">{l.company_name ?? '—'}</div>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Work Orders */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Active Work Orders</h3>
            <Link href="/work-orders" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {wLoading && (
            <div className="p-5 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-slate-100 animate-pulse rounded-md" style={{ width: `${70 - i * 10}%` }} />
              ))}
            </div>
          )}
          {!wLoading && activeWOList.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-400">No active work orders</div>
          )}
          {activeWOList.length > 0 && (
            <div className="divide-y divide-slate-100">
              {activeWOList.map((w: any) => (
                <div key={w.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 font-mono">{w.number}</div>
                    <div className="text-xs text-slate-400 truncate">{w.clients?.name ?? '—'}</div>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Quick Access</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUICK_LINKS.map(({ label, href }) => (
            <Link
              key={href + label}
              href={href}
              className="inline-flex items-center justify-between gap-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 transition-all group"
            >
              {label}
              <ArrowRight size={13} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
