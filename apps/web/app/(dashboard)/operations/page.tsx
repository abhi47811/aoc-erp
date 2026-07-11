'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'

const WO_STAGES = ['draft', 'cutting', 'grinding', 'tempering', 'laminating', 'assembly', 'qc', 'dispatch', 'delivered'] as const

function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <Link href={href} className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all →</Link>
      </div>
      {children}
    </div>
  )
}

export default function OperationsPage() {
  const { data: workOrders = [] } = trpc.workOrder.list.useQuery({})
  const { data: pendingQC = [] } = trpc.qc.listChecks.useQuery({ status: 'pending', limit: 10 })
  const { data: pendingDeliveries = [] } = trpc.delivery.list.useQuery({ status: 'pending', limit: 10 })
  const { data: inventory = [] } = trpc.inventory.list.useQuery({})

  const activeWOs = workOrders.filter((w: any) => !['delivered', 'cancelled'].includes(w.status))
  const stageCounts = WO_STAGES.map(stage => ({
    stage,
    count: activeWOs.filter((w: any) => w.status === stage).length,
  }))

  const lowStock = inventory.filter((i: any) => Number(i.current_stock) <= Number(i.min_stock ?? 0))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Operations</h1>
        <p className="text-sm text-slate-500 mt-0.5">Production floor status — work orders, QC, deliveries, and stock</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Work Orders by Stage</h3>
        <div className="grid grid-cols-3 md:grid-cols-9 gap-3">
          {stageCounts.map(({ stage, count }) => (
            <Link key={stage} href="/work-orders" className="text-center p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors">
              <p className="text-lg font-semibold text-slate-900 tabular-nums">{count}</p>
              <p className="text-[11px] text-slate-500 capitalize mt-0.5">{stage}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="Pending QC Checks" href="/qc">
          {pendingQC.length === 0 ? (
            <p className="text-center py-10 text-sm text-slate-400">Nothing pending.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingQC.map((c: any) => (
                <div key={c.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-slate-900">{c.check_name}</p>
                  <p className="text-xs text-slate-400">WO #{c.work_orders?.number ?? '—'} · {c.work_orders?.clients?.name ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Pending Deliveries" href="/delivery">
          {pendingDeliveries.length === 0 ? (
            <p className="text-center py-10 text-sm text-slate-400">Nothing pending.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingDeliveries.map((d: any) => (
                <div key={d.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-slate-900">{d.number}</p>
                  <p className="text-xs text-slate-400">WO #{d.work_orders?.number ?? '—'} · {d.work_orders?.clients?.name ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Low Stock Items" href="/inventory">
          {lowStock.length === 0 ? (
            <p className="text-center py-10 text-sm text-slate-400">All stock healthy.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {lowStock.map((i: any) => (
                <div key={i.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{i.name}</p>
                    <p className="text-xs text-slate-400">{i.code}</p>
                  </div>
                  <p className="text-xs text-amber-600 tabular-nums">{i.current_stock} / {i.min_stock} {i.unit}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
