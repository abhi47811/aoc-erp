'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { MultiSelectFilter } from '@/components/ui/multi-select-filter'
import { Badge } from '@/components/ui/badge'

type IStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'cancelled'

const STATUS_COLORS: Record<IStatus, 'success' | 'danger' | 'warning' | 'info' | 'violet' | 'neutral'> = {
  draft:     'neutral',
  sent:      'info',
  paid:      'success',
  partial:   'warning',
  cancelled: 'danger',
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
  const deleteInv = trpc.invoice.delete.useMutation({
    onSuccess: () => { refetch(); setDeleteTarget(null) },
    onError: (e) => setDeleteError(e.message),
  })
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoices</h1>
        <Button onClick={() => router.push('/invoices/new')}>
          + New Invoice
        </Button>
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
                  <td colSpan={9} className="text-center py-10 text-sm text-slate-500">No invoices yet.</td>
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
                    <td className={`px-4 py-3 text-right tabular-nums ${paid > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {paid > 0 ? `₹${paid.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium tabular-nums ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {balance > 0 ? `₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '✓'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_COLORS[inv.status as IStatus] ?? 'neutral'} className="capitalize">
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{inv.invoice_date}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteError(null); setDeleteTarget({ id: inv.id, label: inv.number }) }}
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
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this invoice?"
        description={`Invoice ${deleteTarget?.label} will be permanently removed. This can't be undone.`}
        pending={deleteInv.isPending}
        error={deleteError}
        onConfirm={() => deleteTarget && deleteInv.mutate(deleteTarget.id)}
        onCancel={() => { setDeleteTarget(null); setDeleteError(null) }}
      />
    </div>
  )
}
