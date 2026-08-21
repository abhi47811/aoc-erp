'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { MultiSelectFilter } from '@/components/ui/multi-select-filter'

type IStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'cancelled'

const STATUS_COLORS: Record<IStatus, string> = {
  draft:     'bg-slate-100 text-slate-600 border border-slate-200',
  sent:      'bg-blue-50 text-blue-700 border border-blue-100',
  paid:      'bg-emerald-50 text-emerald-700 border border-emerald-100',
  partial:   'bg-amber-50 text-amber-700 border border-amber-100',
  cancelled: 'bg-red-50 text-red-700 border border-red-100',
}

const STATUS_OPTIONS = (Object.keys(STATUS_COLORS) as IStatus[]).map(s => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}))

export default function InvoicesPage() {
  const router = useRouter()
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  const { data: invoices = [], isLoading, refetch } = trpc.invoice.list.useQuery()
  const filteredInvoices = invoices.filter((inv: any) => selectedStatuses.length === 0 || selectedStatuses.includes(inv.status))
  const deleteInv = trpc.invoice.delete.useMutation({ onSuccess: () => refetch() })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoices</h1>
        <button
          onClick={() => router.push('/invoices/new')}
          className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Invoice
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        <MultiSelectFilter label="Status" options={STATUS_OPTIONS} selected={selectedStatuses} onChange={setSelectedStatuses} />
      </div>

      {isLoading ? (
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
                {['Number', 'Client', 'Project', 'Total', 'Paid', 'Balance', 'Status', 'Date', ''].map(h => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider ${
                      ['Total', 'Paid', 'Balance'].includes(h) ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-sm text-slate-400">No invoices yet.</td>
                </tr>
              ) : filteredInvoices.map((inv: any) => {
                const total = Number(inv.total)
                const paid = Number(inv.paid_amount)
                const balance = total - paid
                return (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-900 font-medium">{inv.number}</td>
                    <td className="px-4 py-3 text-slate-800">{inv.clients?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{inv.projects?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-900 font-medium tabular-nums">
                      ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${paid > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {paid > 0 ? `₹${paid.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium tabular-nums ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {balance > 0 ? `₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '✓'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${STATUS_COLORS[inv.status as IStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{inv.invoice_date}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); deleteInv.mutate(inv.id) }}
                        className="text-slate-400 hover:text-red-500 text-xs transition-colors"
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
  )
}
