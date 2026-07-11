'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'

type LineItem = {
  description: string
  qty: number
  unit: string
  unit_price: number
  cgst_pct: number
  sgst_pct: number
  igst_pct: number
}

const EMPTY_ITEM: LineItem = {
  description: '', qty: 1, unit: 'nos', unit_price: 0, cgst_pct: 9, sgst_pct: 9, igst_pct: 0,
}

function calcAmount(item: LineItem) {
  return item.qty * item.unit_price
}

function calcTotal(item: LineItem) {
  const amount = calcAmount(item)
  return amount + amount * (item.cgst_pct + item.sgst_pct + item.igst_pct) / 100
}

function fmtMoney(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={null}>
      <NewInvoiceForm />
    </Suspense>
  )
}

function NewInvoiceForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromQuotationId = searchParams.get('from_quotation')

  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [quotationId, setQuotationId] = useState(fromQuotationId ?? '')
  const [number, setNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }])
  const [prefillBanner, setPrefillBanner] = useState(false)
  const [error, setError] = useState('')

  const { data: clients = [] } = trpc.clients.list.useQuery({ active_only: true })
  const { data: projects = [] } = trpc.project.list.useQuery({})
  const { data: quotation } = trpc.quotation.get.useQuery(fromQuotationId ?? '', { enabled: !!fromQuotationId })

  // Pre-fill client/project/items from the source quotation, if converting one.
  useEffect(() => {
    if (!quotation || prefillBanner) return
    setClientId((quotation as any).client_id ?? '')
    setProjectId((quotation as any).project_id ?? '')
    const qItems = (quotation as any).quotation_items as Array<{ description: string; qty: number; unit: string | null; unit_price: number }> | undefined
    if (qItems && qItems.length > 0) {
      setItems(qItems.map(it => ({
        description: it.description,
        qty: it.qty,
        unit: it.unit || 'nos',
        unit_price: Number(it.unit_price) || 0,
        cgst_pct: 9,
        sgst_pct: 9,
        igst_pct: 0,
      })))
    }
    setPrefillBanner(true)
  }, [quotation, prefillBanner])

  const createInvoice = trpc.invoice.create.useMutation({
    onSuccess: (inv: any) => router.push(`/invoices/${inv.id}`),
    onError: (err) => setError(err.message),
  })

  const updateItem = (i: number, patch: Partial<LineItem>) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }
  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }])
  const removeItem = (i: number) => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)

  const subtotal = items.reduce((s, it) => s + calcAmount(it), 0)
  const grandTotal = items.reduce((s, it) => s + calcTotal(it), 0)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const validItems = items.filter(it => it.description.trim().length > 0)
    if (validItems.length === 0) { setError('Add at least one line item'); return }
    if (!number.trim()) { setError('Invoice number is required'); return }

    createInvoice.mutate({
      client_id: clientId || undefined,
      project_id: projectId || undefined,
      quotation_id: quotationId || undefined,
      number: number.trim(),
      status: 'draft',
      invoice_date: invoiceDate,
      due_date: dueDate || undefined,
      notes: notes || undefined,
      items: validItems.map((it, i) => ({
        description: it.description,
        qty: it.qty,
        unit: it.unit || undefined,
        unit_price: it.unit_price,
        cgst_pct: it.cgst_pct,
        sgst_pct: it.sgst_pct,
        igst_pct: it.igst_pct,
        sort_order: i,
      })),
    })
  }

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">New Invoice</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create an invoice and its line items</p>
        </div>
        <button onClick={() => router.push('/invoices')} className="text-sm text-slate-500 hover:text-slate-700">← Invoices</button>
      </div>

      {prefillBanner && fromQuotationId && (
        <div className="bg-violet-50 border border-violet-100 rounded-lg px-4 py-3 text-sm text-violet-700">
          Line items pre-filled from quotation {(quotation as any)?.number ?? ''}. Review before saving.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Invoice No. *</label>
            <input value={number} onChange={e => setNumber(e.target.value)} required placeholder="INV-2026-001" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Client</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className={inputClass}>
              <option value="">— Select client —</option>
              {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Project</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className={inputClass}>
              <option value="">— None —</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Invoice Date *</label>
            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Line Items</h3>
            <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Item</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Description', 'Qty', 'Unit Price', 'CGST %', 'SGST %', 'IGST %', 'Total', ''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <input value={item.description} onChange={e => updateItem(i, { description: e.target.value })}
                        placeholder="Item description" className={inputClass} />
                    </td>
                    <td className="px-3 py-2 w-20">
                      <input type="number" min="1" value={item.qty} onChange={e => updateItem(i, { qty: Number(e.target.value) || 1 })} className={inputClass} />
                    </td>
                    <td className="px-3 py-2 w-28">
                      <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, { unit_price: Number(e.target.value) || 0 })} className={inputClass} />
                    </td>
                    <td className="px-3 py-2 w-20">
                      <input type="number" min="0" step="0.01" value={item.cgst_pct} onChange={e => updateItem(i, { cgst_pct: Number(e.target.value) || 0 })} className={inputClass} />
                    </td>
                    <td className="px-3 py-2 w-20">
                      <input type="number" min="0" step="0.01" value={item.sgst_pct} onChange={e => updateItem(i, { sgst_pct: Number(e.target.value) || 0 })} className={inputClass} />
                    </td>
                    <td className="px-3 py-2 w-20">
                      <input type="number" min="0" step="0.01" value={item.igst_pct} onChange={e => updateItem(i, { igst_pct: Number(e.target.value) || 0 })} className={inputClass} />
                    </td>
                    <td className="px-3 py-2 text-slate-700 tabular-nums whitespace-nowrap">{fmtMoney(calcTotal(item))}</td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => removeItem(i)} className="text-slate-400 hover:text-red-500 text-xs">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-6">
            <div className="text-sm text-slate-500">Subtotal: <span className="text-slate-900 font-semibold tabular-nums">{fmtMoney(subtotal)}</span></div>
            <div className="text-sm text-slate-500">Total (incl. GST): <span className="text-slate-900 font-semibold tabular-nums">{fmtMoney(grandTotal)}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Notes / Terms</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputClass} placeholder="Payment terms, delivery notes, etc." />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => router.push('/invoices')}
            className="px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={createInvoice.isPending}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
            {createInvoice.isPending ? 'Saving…' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}
