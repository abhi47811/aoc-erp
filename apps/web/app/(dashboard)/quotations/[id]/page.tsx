'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Topbar } from '@/components/topbar'

type QStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'

interface LineItem {
  description: string
  qty: number
  unit: string
  width_mm: number | ''
  height_mm: number | ''
  glass_type: string
  thickness_mm: number | ''
  unit_price: number
}

const EMPTY_ITEM: LineItem = {
  description: '', qty: 1, unit: 'sqm',
  width_mm: '', height_mm: '', glass_type: '', thickness_mm: '', unit_price: 0,
}

function calcItem(item: LineItem) {
  const w = Number(item.width_mm) || 0
  const h = Number(item.height_mm) || 0
  const area = (w && h) ? (item.qty * w * h) / 1_000_000 : 0
  const amount = item.qty * item.unit_price
  return { area, amount }
}

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function QuotationPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = id === 'new'

  const { data: clients = [] } = trpc.clients.list.useQuery()
  const { data: projects = [] } = trpc.project.list.useQuery()

  const { data: existing, isLoading } = trpc.quotation.get.useQuery(id, { enabled: !isNew })

  const [form, setForm] = useState({
    number: '',
    client_id: '',
    project_id: '',
    status: 'draft' as QStatus,
    valid_until: '',
    terms: '',
    notes: '',
  })
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }])
  const [error, setError] = useState('')

  useEffect(() => {
    if (existing) {
      setForm({
        number: existing.number,
        client_id: existing.client_id ?? '',
        project_id: existing.project_id ?? '',
        status: existing.status as QStatus,
        valid_until: existing.valid_until ?? '',
        terms: existing.terms ?? '',
        notes: existing.notes ?? '',
      })
      const existingItems = (existing as any).quotation_items ?? []
      if (existingItems.length > 0) {
        setItems(existingItems.map((it: any) => ({
          description: it.description,
          qty: Number(it.qty),
          unit: it.unit ?? 'sqm',
          width_mm: it.width_mm ? Number(it.width_mm) : '',
          height_mm: it.height_mm ? Number(it.height_mm) : '',
          glass_type: it.glass_type ?? '',
          thickness_mm: it.thickness_mm ? Number(it.thickness_mm) : '',
          unit_price: Number(it.unit_price),
        })))
      }
    }
  }, [existing])

  const create = trpc.quotation.create.useMutation({
    onSuccess: (q) => router.push(`/quotations/${q.id}`),
    onError: (e) => setError(e.message),
  })
  const update = trpc.quotation.update.useMutation({
    onSuccess: () => setError(''),
    onError: (e) => setError(e.message),
  })
  const updateStatus = trpc.quotation.updateStatus.useMutation({
    onError: (e) => setError(e.message),
  })

  const subtotal = items.reduce((s, it) => s + calcItem(it).amount, 0)

  function setItem(i: number, patch: Partial<LineItem>) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }

  function addItem() { setItems(prev => [...prev, { ...EMPTY_ITEM }]) }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }

  function buildPayload() {
    return {
      ...form,
      client_id: form.client_id || undefined,
      project_id: form.project_id || undefined,
      valid_until: form.valid_until || undefined,
      items: items.map(it => ({
        description: it.description,
        qty: Number(it.qty),
        unit: it.unit || undefined,
        width_mm: it.width_mm !== '' ? Number(it.width_mm) : undefined,
        height_mm: it.height_mm !== '' ? Number(it.height_mm) : undefined,
        glass_type: it.glass_type || undefined,
        thickness_mm: it.thickness_mm !== '' ? Number(it.thickness_mm) : undefined,
        unit_price: Number(it.unit_price),
      })),
    }
  }

  function save() {
    setError('')
    if (isNew) {
      create.mutate(buildPayload())
    } else {
      update.mutate({ id, data: buildPayload() })
    }
  }

  if (!isNew && isLoading) {
    return (
      <div className="space-y-6">
        <Topbar breadcrumbs={[{ label: 'Quotations', href: '/quotations' }, { label: '…' }]} />
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 10}%` }} />
          ))}
        </div>
      </div>
    )
  }

  const STATUS_OPTIONS: QStatus[] = ['draft','sent','approved','rejected','converted']

  return (
    <div className="space-y-6">
      <Topbar breadcrumbs={[
        { label: 'Quotations', href: '/quotations' },
        { label: isNew ? 'New' : form.number },
      ]} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Number *</label>
            <input
              required
              value={form.number}
              onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
              placeholder="QT-001"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as QStatus }))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Client</label>
            <select
              value={form.client_id}
              onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">— None —</option>
              {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Project</label>
            <select
              value={form.project_id}
              onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">— None —</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Valid Until</label>
            <input
              type="date"
              value={form.valid_until}
              onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Terms</label>
            <input
              value={form.terms}
              onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
              placeholder="Payment terms, delivery, etc."
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Line Items</h2>
          <button
            onClick={addItem}
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
                <th className="text-left px-3 py-2 font-medium text-slate-500 uppercase tracking-wider w-20">W (mm)</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 uppercase tracking-wider w-20">H (mm)</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 uppercase tracking-wider w-24">Glass Type</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 uppercase tracking-wider w-16">Thk</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 uppercase tracking-wider w-20">Area m²</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 uppercase tracking-wider w-28">Unit Price</th>
                <th className="text-right px-3 py-2 font-medium text-slate-500 uppercase tracking-wider w-28">Amount</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, i) => {
                const { area, amount } = calcItem(item)
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-2 py-1.5">
                      <input
                        value={item.description}
                        onChange={e => setItem(i, { description: e.target.value })}
                        placeholder="Panel description…"
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.qty}
                        onChange={e => setItem(i, { qty: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        value={item.width_mm}
                        onChange={e => setItem(i, { width_mm: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        value={item.height_mm}
                        onChange={e => setItem(i, { height_mm: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={item.glass_type}
                        onChange={e => setItem(i, { glass_type: e.target.value })}
                        placeholder="Clear Float"
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        value={item.thickness_mm}
                        onChange={e => setItem(i, { thickness_mm: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-slate-500 text-center tabular-nums">
                      {area > 0 ? area.toFixed(3) : '—'}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={e => setItem(i, { unit_price: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-slate-900 text-right font-medium tabular-nums">
                      ₹{fmt(amount)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => removeItem(i)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
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

        {/* Totals */}
        <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
          <div className="space-y-1 text-sm min-w-48">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="text-slate-900">₹{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Tax</span>
              <span>₹0.00</span>
            </div>
            <div className="flex justify-between text-slate-900 font-semibold text-base border-t border-slate-200 pt-1 mt-1">
              <span>Total</span>
              <span className="tabular-nums">₹{fmt(subtotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Notes</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-6">
        <button
          onClick={() => router.push('/quotations')}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={create.isPending || update.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {(create.isPending || update.isPending) ? 'Saving…' : 'Save Quotation'}
        </button>
        {!isNew && form.status === 'approved' && (
          <button
            onClick={() => router.push(`/invoices/new?from_quotation=${id}`)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Convert to Invoice →
          </button>
        )}
      </div>
    </div>
  )
}
