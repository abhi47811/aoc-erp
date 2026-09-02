'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { trpc } from '@/lib/trpc'
import {
  Users, FolderKanban, ClipboardList, IndianRupee,
  Truck, CheckSquare, ArrowRight, Info,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

// recharts is a heavy dependency (~90kB) only needed for these small sparklines —
// load it on the client only, after the rest of the dashboard has rendered.
const DashboardSparkline = dynamic(
  () => import('@/components/dashboard-sparkline').then(m => m.DashboardSparkline),
  { ssr: false, loading: () => <div className="w-14 h-7" /> }
)

function last7DayBuckets(items: any[], dateField: string, valueFn: (item: any) => number): number[] {
  const days: string[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days.map(day =>
    items.reduce((sum, item) => (
      String(item?.[dateField] ?? '').slice(0, 10) === day ? sum + valueFn(item) : sum
    ), 0)
  )
}

function last7DayCounts(items: any[], dateField = 'created_at'): number[] {
  return last7DayBuckets(items, dateField, () => 1)
}

type ColorKey = 'blue' | 'violet' | 'amber' | 'emerald' | 'orange' | 'rose'

const COLOR_MAP: Record<ColorKey, {
  iconBg: string
  iconColor: string
  trendColor: string
  dot: string
}> = {
  blue:    { iconBg: 'bg-blue-500/10',    iconColor: 'text-blue-500',    trendColor: '#3b82f6', dot: 'bg-blue-400'    },
  violet:  { iconBg: 'bg-violet-500/10',  iconColor: 'text-violet-500',  trendColor: '#8b5cf6', dot: 'bg-violet-400'  },
  amber:   { iconBg: 'bg-amber-500/10',   iconColor: 'text-amber-500',   trendColor: '#f59e0b', dot: 'bg-amber-400'   },
  emerald: { iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', trendColor: '#10b981', dot: 'bg-emerald-400' },
  orange:  { iconBg: 'bg-orange-500/10',  iconColor: 'text-orange-500',  trendColor: '#f97316', dot: 'bg-orange-400'  },
  rose:    { iconBg: 'bg-rose-500/10',    iconColor: 'text-rose-500',    trendColor: '#f43f5e', dot: 'bg-rose-400'    },
}

function StatCard({ label, value, href, loading, icon: Icon, help, trend, trendFormat, color = 'blue' }: {
  label: string
  value: string | number
  href?: string
  loading?: boolean
  icon?: React.ComponentType<{ size?: number; className?: string }>
  help?: string
  trend?: number[]
  trendFormat?: ((n: number) => string) | undefined
  color?: ColorKey
}) {
  const c = COLOR_MAP[color]
  const inner = (
    <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 hover:shadow-md hover:border-slate-300 transition-all group relative overflow-hidden">
      {/* Subtle top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.iconBg.replace('/10', '/40')}`} />

      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-lg ${c.iconBg} flex items-center justify-center shrink-0`}>
          {Icon && <Icon size={16} aria-hidden="true" className={c.iconColor} />}
        </div>
        {help && (
          <Tooltip content={help}>
            <Info size={12} aria-label={`About ${label}`} className="text-slate-300 hover:text-slate-500 transition-colors mt-1" />
          </Tooltip>
        )}
      </div>

      {loading ? (
        <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-md" />
      ) : (
        <div className="flex items-end justify-between gap-2">
          <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">{value}</p>
          {trend && trend.length > 0 && (
            <div className="shrink-0 -mb-1">
              <DashboardSparkline trend={trend} color={c.trendColor} label={label} format={trendFormat} />
            </div>
          )}
        </div>
      )}
      <p className="text-xs font-medium text-slate-500 mt-1.5 uppercase tracking-wider">{label}</p>
    </div>
  )
  return href ? (
    <Link href={href} aria-label={`${label}: ${value}`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl block">
      {inner}
    </Link>
  ) : inner
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'violet' | 'neutral' | 'sky'> = {
    new:         'info',
    qualified:   'violet',
    won:         'success',
    lost:        'danger',
    in_progress: 'warning',
    scheduled:   'sky',
  }
  const label = status
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return (
    <Badge tone={map[status] ?? 'neutral'}>
      {label}
    </Badge>
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

  const openLeads      = leadsList.filter(l => !['won','lost','closed'].includes(l.status)).length
  const activeProjects = projectsList.filter(p => p.status === 'active').length
  const activeWOs      = woList.filter(w => !['delivered','cancelled'].includes(w.status)).length

  const now        = new Date()
  const mtdStart   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const mtdRevenue = invList
    .filter(inv => inv.status === 'paid' && inv.created_at >= mtdStart)
    .reduce((sum: number, inv: any) => sum + parseFloat(inv.total ?? '0'), 0)

  const pendingDeliveries = delList.filter(d => d.status === 'pending').length
  const pendingQC         = qcList.filter(c => c.status === 'pending').length

  const recentLeads  = leadsList.slice(0, 5)
  const activeWOList = woList.filter(w => !['delivered','cancelled'].includes(w.status)).slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">AOC Glass ERP — live overview</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={Users}         label="Open Leads"       value={openLeads}
          href="/leads"        loading={lLoading}       color="blue"
          help="Leads not yet marked won, lost, or closed."
          trend={last7DayCounts(leadsList.filter(l => !['won','lost','closed'].includes(l.status)))}
        />
        <StatCard
          icon={FolderKanban}  label="Active Projects"  value={activeProjects}
          href="/projects"     loading={pLoading}       color="violet"
          help="Projects currently in 'active' status."
          trend={last7DayCounts(projectsList.filter(p => p.status === 'active'))}
        />
        <StatCard
          icon={ClipboardList} label="Work Orders"      value={activeWOs}
          href="/work-orders"  loading={wLoading}       color="amber"
          help="Work orders currently in progress or scheduled."
          trend={last7DayCounts(woList.filter(w => !['delivered','cancelled'].includes(w.status)))}
        />
        <StatCard
          icon={IndianRupee}   label="MTD Revenue"      value={fmt(mtdRevenue)}
          href="/invoices"     loading={iLoading}       color="emerald"
          help="Total value of paid invoices this calendar month."
          trend={last7DayBuckets(invList.filter(inv => inv.status === 'paid'), 'created_at', (inv: any) => parseFloat(inv.total ?? '0'))}
          trendFormat={fmt}
        />
        <StatCard
          icon={Truck}         label="Pending Delivery" value={pendingDeliveries}
          href="/delivery"     loading={dLoading}       color="orange"
          help="Deliveries awaiting dispatch."
          trend={last7DayCounts(delList.filter(d => d.status === 'pending'))}
        />
        <StatCard
          icon={CheckSquare}   label="Pending QC"       value={pendingQC}
          href="/qc"           loading={qLoading}       color="rose"
          help="Quality checks awaiting a pass/fail result."
          trend={last7DayCounts(qcList.filter(c => c.status === 'pending'))}
        />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Recent Leads</h3>
            <Link href="/leads" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors">
              View all <ArrowRight size={12} aria-hidden="true" />
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
            <div className="py-10 text-center text-sm text-slate-500">No leads yet</div>
          )}
          {recentLeads.length > 0 && (
            <div className="divide-y divide-slate-100">
              {recentLeads.map((l: any) => (
                <div key={l.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{l.name}</div>
                    <div className="text-xs text-slate-500 truncate">{l.company ?? '—'}</div>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Work Orders */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Active Work Orders</h3>
            <Link href="/work-orders" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors">
              View all <ArrowRight size={12} aria-hidden="true" />
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
            <div className="py-10 text-center text-sm text-slate-500">No active work orders</div>
          )}
          {activeWOList.length > 0 && (
            <div className="divide-y divide-slate-100">
              {activeWOList.map((w: any) => (
                <div key={w.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 font-mono">{w.number}</div>
                    <div className="text-xs text-slate-500 truncate">{w.clients?.name ?? '—'}</div>
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
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Quick Access</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUICK_LINKS.map(({ label, href }) => (
            <Link
              key={href + label}
              href={href}
              className="inline-flex items-center justify-between gap-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {label}
              <ArrowRight size={13} aria-hidden="true" className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
