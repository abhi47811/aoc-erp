'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { ActivityTimeline } from '@/components/ui/activity-timeline'
import { NotFoundCard } from '@/components/ui/not-found-card'
import { useDialogA11y } from '@/lib/use-dialog-a11y'

type IStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'cancelled'

interface LineItem {
  description: string
  qty: number
  unit: string
  unit_price: number
  cgst_pct: number
  sgst_pct: number
  igst_pct: number
}

const EMPTY_ITEM: LineItem = {
  description: '', qty: 1, unit: 'sqm',
  unit_price: 0, cgst_pct: 9, sgst_pct: 9, igst_pct: 0,
}

function calcItem(item: LineItem) {
  const amount = item.qty * item.unit_price
  const cgst = amount * item.cgst_pct / 100
  const sgst = amount * item.sgst_pct / 100
  const igst = amount * item.igst_pct / 100
  return { amount, cgst, sgst, igst, total: amount + cgst + sgst + igst }
}

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const utils = trpc.useUtils()
  const isNew = id === 'new'
  const fromQuotation = searchParams.get('from_quotation')

  const { data: clients = [] } = trpc.clients.list.useQuery()
  const { data: projects = [] } = trpc.project.list.useQuery()
  const { data: existingQ } = trpc.quotation.get.useQuery(fromQuotation!, { enabled: !!fromQuotation })
  const { data: existing, isLoading, isError } = trpc.invoice.get.useQuery(id, { enabled: !isNew })

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    number: '',
    client_id: '',
    project_id: '',
    quotation_id: '',
    status: 'draft' as IStatus,
    invoice_date: today,
    due_date: '',
    notes: '',
  })
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }])
  const [error, setError] = useState('')
  const [paidInput, setPaidInput] = useState('')
  const [showPay, setShowPay] = useState(false)
  const payDialogRef = useRef<HTMLDivElement>(null)
  useDialogA11y(showPay, () => setShowPay(false), payDialogRef)

  // Pre-fill from quotation
  useEffect(() => {
    if (existingQ && isNew) {
      setForm(f => ({
        ...f,
        client_id: existingQ.client_id ?? '',
        project_id: existingQ.project_id ?? '',
        quotation_id: existingQ.id,
      }))
      const qItems = (existingQ as any).quotation_items ?? []
      if (qItems.length > 0) {
        setItems(qItems.map((it: any) => ({
          description: it.description,
          qty: Number(it.qty),
          unit: it.unit ?? 'sqm',
          unit_price: Number(it.unit_price),
          cgst_pct: 9,
          sgst_pct: 9,
          igst_pct: 0,
        })))
      }
    }
  }, [existingQ, isNew])

  // Load existing invoice
  useEffect(() => {
    if (existing) {
      setForm({
        number: existing.number,
        client_id: existing.client_id ?? '',
        project_id: existing.project_id ?? '',
        quotation_id: existing.quotation_id ?? '',
        status: existing.status as IStatus,
        invoice_date: existing.invoice_date ?? today,
        due_date: existing.due_date ?? '',
        notes: existing.notes ?? '',
      })
      const existingItems = (existing as any).invoice_items ?? []
      if (existingItems.length > 0) {
        setItems(existingItems.map((it: any) => ({
          description: it.description,
          qty: Number(it.qty),
          unit: it.unit ?? 'sqm',
          unit_price: Number(it.unit_price),
          cgst_pct: Number(it.cgst_pct),
          sgst_pct: Number(it.sgst_pct),
          igst_pct: Number(it.igst_pct),
        })))
      }
      setPaidInput(String(existing.paid_amount ?? '0'))
    }
  }, [existing])

  const create = trpc.invoice.create.useMutation({
    onSuccess: (inv) => router.push(`/invoices/${inv.id}`),
    onError: (e) => setError(e.message),
  })
  const update = trpc.invoice.update.useMutation({
    onSuccess: () => {
      setError('')
      utils.invoice.get.invalidate(id)
      utils.invoice.list.invalidate()
    },
    onError: (e) => setError(e.message),
  })
  const updateStatus = trpc.invoice.updateStatus.useMutation({
    onSuccess: () => {
      utils.invoice.get.invalidate(id)
      utils.invoice.list.invalidate()
    },
    onError: (e) => setError(e.message),
  })

  const totals = items.reduce(
    (acc, it) => {
      const c = calcItem(it)
      return {
        subtotal: acc.subtotal + c.amount,
        cgst: acc.cgst + c.cgst,
        sgst: acc.sgst + c.sgst,
        igst: acc.igst + c.igst,
        total: acc.total + c.total,
      }
    },
    { subtotal: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
  )

  function setItem(i: number, patch: Partial<LineItem>) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }

  function buildPayload() {
    return {
      ...form,
      client_id: form.client_id || undefined,
      project_id: form.project_id || undefined,
      quotation_id: form.quotation_id || undefined,
      due_date: form.due_date || undefined,
      items: items.map(it => ({
        description: it.description,
        qty: it.qty,
        unit: it.unit || undefined,
        unit_price: it.unit_price,
        cgst_pct: it.cgst_pct,
        sgst_pct: it.sgst_pct,
        igst_pct: it.igst_pct,
      })),
    }
  }

  function save() {
    setError('')
    if (isNew) {
      create.mutate(buildPayload() as any)
    } else {
      update.mutate({ id, data: buildPayload() as any })
    }
  }

  function recordPayment() {
    if (!id || isNew) return
    updateStatus.mutate({ id, status: 'partial', paid_amount: paidInput })
    setShowPay(false)
  }

  if (!isNew && isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 10}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!isNew && isError) return <NotFoundCard entity="invoice" backHref="/invoices" />

  const STATUS_OPTIONS: IStatus[] = ['draft','sent','paid','partial','cancelled']

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="invoice-number" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Invoice # *</label>
            <input
              id="invoice-number"
              required
              value={form.number}
              onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
              placeholder="INV-001"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="invoice-status" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Status</label>
            <select
              id="invoice-status"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as IStatus }))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="invoice-date" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Invoice Date *</label>
            <input
              id="invoice-date"
              type="date"
              value={form.invoice_date}
              onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="invoice-due-date" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Due Date</label>
            <input
              id="invoice-due-date"
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="invoice-client" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Client</label>
            <select
              id="invoice-client"
              value={form.client_id}
              onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">— None —</option>
              {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="invoice-project" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Project</label>
            <select
              id="invoice-project"
              value={form.project_id}
              onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">— None —</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Line Items</h2>
          <button
            onClick={() => setItems(prev => [...prev, { ...EMPTY_ITEM }])}
            className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
          >
            + Add Row
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-500 uppercase tracking-wider w-64">Description</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 uppercase tracking-wider w-16">Qty</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 uppercase tracking-wider w-28">Unit Price</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 uppercase tracking-wider w-16">CGST%</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 uppercase tracking-wider w-16">SGST%</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 uppercase tracking-wider w-16">IGST%</th>
                <th className="text-right px-3 py-2 font-medium text-slate-500 uppercase tracking-wider w-28">Amount</th>
                <th className="text-right px-3 py-2 font-medium text-slate-500 uppercase tracking-wider w-28">Total (w/ GST)</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, i) => {
                const c = calcItem(item)
                return (
                  <tr key={i}>
                    <td className="px-2 py-1.5">
                      <input
                        value={item.description}
                        onChange={e => setItem(i, { description: e.target.value })}
                        placeholder="Item description…"
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="0.001" step="0.001"
                        value={item.qty}
                        onChange={e => setItem(i, { qty: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="0" step="0.01"
                        value={item.unit_price}
                        onChange={e => setItem(i, { unit_price: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      />
                    </td>
                    {(['cgst_pct','sgst_pct','igst_pct'] as const).map(field => (
                      <td key={field} className="px-2 py-1.5">
                        <input
                          type="number" min="0" max="50" step="0.5"
                          value={item[field]}
                          onChange={e => setItem(i, { [field]: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-slate-600 text-right tabular-nums">₹{fmt(c.amount)}</td>
                    <td className="px-3 py-1.5 text-slate-900 text-right font-medium tabular-nums">₹{fmt(c.total)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-500 hover:text-red-500 transition-colors"
                        disabled={items.length === 1}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* GST Totals */}
        <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
          <div className="space-y-1 text-sm min-w-56">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="text-slate-900">₹{fmt(totals.subtotal)}</span>
            </div>
            {totals.cgst > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>CGST</span>
                <span>₹{fmt(totals.cgst)}</span>
              </div>
            )}
            {totals.sgst > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>SGST</span>
                <span>₹{fmt(totals.sgst)}</span>
              </div>
            )}
            {totals.igst > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>IGST</span>
                <span>₹{fmt(totals.igst)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 font-semibold text-base border-t border-slate-200 pt-1 mt-1">
              <span>Total</span>
              <span>₹{fmt(totals.total)}</span>
            </div>
            {!isNew && Number(existing?.paid_amount) > 0 && (
              <>
                <div className="flex justify-between text-emerald-600">
                  <span>Paid</span>
                  <span>₹{fmt(Number(existing?.paid_amount))}</span>
                </div>
                <div className="flex justify-between text-red-600 font-medium">
                  <span>Balance Due</span>
                  <span>₹{fmt(totals.total - Number(existing?.paid_amount))}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="invoice-notes" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Notes</label>
        <textarea
          id="invoice-notes"
          rows={3}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>

      {/* Payment modal */}
      {showPay && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div ref={payDialogRef} role="dialog" aria-modal="true" aria-labelledby="record-payment-title" className="bg-white border border-slate-200 rounded-2xl shadow-elevation-lg animate-fade-in-up p-6 space-y-4 w-80">
            <h3 id="record-payment-title" className="text-base font-semibold text-slate-900">Record Payment</h3>
            <div>
              <label htmlFor="payment-amount" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Amount Paid (₹)</label>
              <input
                id="payment-amount"
                type="number" min="0" step="0.01"
                value={paidInput}
                onChange={e => setPaidInput(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPay(false)} className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">Cancel</button>
              <button onClick={recordPayment} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap pb-6">
        <button
          onClick={() => router.push('/invoices')}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={create.isPending || update.isPending}
          className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {(create.isPending || update.isPending) ? 'Saving…' : 'Save Invoice'}
        </button>
        {!isNew && (
          <button
            onClick={() => setShowPay(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Record Payment
          </button>
        )}
        {!isNew && form.status === 'draft' && (
          <button
            onClick={() => updateStatus.mutate({ id, status: 'sent' })}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Mark as Sent
          </button>
        )}
        {!isNew && (form.status === 'sent' || form.status === 'partial') && (
          <button
            onClick={() => updateStatus.mutate({ id, status: 'paid', paid_amount: String(totals.total) })}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Mark as Paid
          </button>
        )}
      </div>

      {!isNew && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Activity</h2>
          <ActivityTimeline tableName="invoices" recordId={id} />
        </div>
      )}
    </div>
  )
}
