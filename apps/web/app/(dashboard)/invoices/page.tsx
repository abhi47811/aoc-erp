'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Topbar } from '@/components/topbar'

type IStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'cancelled'

const STATUS_COLORS: Record<IStatus, string> = {
  draft:     'bg-zinc-500/10 text-zinc-400',
  sent:      'bg-blue-500/10 text-blue-400',
  paid:      'bg-green-500/10 text-green-400',
  partial:   'bg-yellow-500/10 text-yellow-400',
  cancelled: 'bg-red-500/10 text-red-400',
}

export default function InvoicesPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('')

  const { data: invoices = [], isLoading, refetch } = trpc.invoice.list.useQuery(
    statusFilter ? { status: statusFilter } : undefined
  )
  const deleteInv = trpc.invoice.delete.useMutation({ onSuccess: () => refetch() })

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Topbar breadcrumbs={[{ label: 'Invoices' }]} />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100">Invoices</h1>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
            >
              <option value="">All Status</option>
              {(['draft','sent','paid','partial','cancelled'] as IStatus[]).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={() => router.push('/invoices/new')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + New Invoice
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-zinc-500 text-sm">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="text-zinc-500 text-sm text-center py-16">No invoices yet.</div>
        ) : (
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-wide">
                <tr>
                  {['Number','Client','Project','Total','Paid','Balance','Status','Date',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {invoices.map((inv: any) => {
                  const total = Number(inv.total)
                  const paid = Number(inv.paid_amount)
                  const balance = total - paid
                  return (
                    <tr
                      key={inv.id}
                      className="bg-zinc-950 hover:bg-zinc-900 transition-colors cursor-pointer"
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                    >
                      <td className="px-4 py-3 text-zinc-100 font-mono text-xs">{inv.number}</td>
                      <td className="px-4 py-3 text-zinc-300">{inv.clients?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-zinc-400">{inv.projects?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-zinc-100 font-medium">
                        ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-green-400">
                        {paid > 0 ? `₹${paid.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '—'}
                      </td>
                      <td className={`px-4 py-3 font-medium ${balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {balance > 0 ? `₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '✓'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[inv.status as IStatus] ?? ''}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{inv.invoice_date}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={e => { e.stopPropagation(); deleteInv.mutate(inv.id) }}
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
    </div>
  )
}
