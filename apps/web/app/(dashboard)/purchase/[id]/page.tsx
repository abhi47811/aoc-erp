'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'

type LineItem = { item_id?: string; description: string; qty: number; unit_price: number }

type Form = {
  number: string
  supplier_id: string
  order_date: string
  expected_date: string
  notes: string
  items: LineItem[]
}

const today = new Date().toISOString().split('T')[0] ?? ''

const emptyForm: Form = {
  number: '',
  supplier_id: '',
  order_date: today,
  expected_date: '',
  notes: '',
  items: [{ description: '', qty: 1, unit_price: 0 }],
}

export default function PurchaseOrderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = id === 'new'

  const [form, setForm] = useState<Form>(emptyForm)
  const [showReceive, setShowReceive] = useState(false)
  const [received, setReceived] = useState<Record<string, number>>({})

  const { data: existing } = trpc.purchase.get.useQuery(id, { enabled: !isNew })
  const { data: suppliers = [] } = trpc.supplier.list.useQuery()
  const { data: inventoryItems = [] } = trpc.inventory.list.useQuery()
  const create = trpc.purchase.create.useMutation({ onSuccess: () => router.push('/purchase') })
  const update = trpc.purchase.update.useMutation({ onSuccess: () => router.push('/purchase') })
  const receive = trpc.purchase.receive.useMutation({
    onSuccess: () => { setShowReceive(false); router.refresh() }
  })

  useEffect(() => {
    if (existing) {
      const ex = existing as any
      setForm({
        number: ex.number,
        supplier_id: ex.supplier_id ?? '',
        order_date: ex.order_date,
        expected_date: ex.expected_date ?? '',
        notes: ex.notes ?? '',
        items: ex.purchase_order_items?.map((it: any) => ({
          item_id: it.item_id ?? undefined,
          description: it.description,
          qty: Number(it.qty),
          unit_price: Number(it.unit_price),
        })) ?? [],
      })
      const rec: Record<string, number> = {}
      ex.purchase_order_items?.forEach((it: any) => {
        rec[it.id] = Number(it.received_qty)
      })
      setReceived(rec)
    }
  }, [existing])

  const subtotal = form.items.reduce((s, it) => s + it.qty * it.unit_price, 0)
  const set = (k: keyof Form, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  function updateLine(i: number, k: keyof LineItem, v: unknown) {
    const items = [...form.items]
    items[i] = { ...items[i], [k]: v } as LineItem
    setForm(p => ({ ...p, items }))
  }

  function addLine() {
    setForm(p => ({ ...p, items: [...p.items, { description: '', qty: 1, unit_price: 0 }] }))
  }

  function removeLine(i: number) {
    setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))
  }

  function save() {
    const payload = {
      ...form,
      supplier_id: form.supplier_id || undefined,
      expected_date: form.expected_date || undefined,
    }
    if (isNew) {
      create.mutate(payload as any)
    } else {
      update.mutate({ id, data: payload as any })
    }
  }

  const ex = existing as any

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          {isNew ? 'New Purchase Order' : `PO #${ex?.number ?? '…'}`}
        </h1>
        {!isNew && ex?.status !== 'received' && ex?.status !== 'cancelled' && (
          <button
            onClick={() => setShowReceive(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Receive Items
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">PO Number *</label>
            <input
              value={form.number}
              onChange={e => set('number', e.target.value)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              placeholder="PO-2026-001"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Supplier</label>
            <select
              value={form.supplier_id}
              onChange={e => set('supplier_id', e.target.value)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">— Select supplier —</option>
              {(suppliers as any[]).map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Order Date *</label>
            <input
              type="date"
              value={form.order_date}
              onChange={e => set('order_date', e.target.value)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Expected Delivery</label>
            <input
              type="date"
              value={form.expected_date}
              onChange={e => set('expected_date', e.target.value)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-800">Items</h3>
          <button onClick={addLine} className="text-blue-600 hover:text-blue-700 text-xs font-medium">+ Add Line</button>
        </div>

        <div className="space-y-2">
          {form.items.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-2">
                <select
                  value={line.item_id ?? ''}
                  onChange={e => {
                    const inv = (inventoryItems as any[]).find((it: any) => it.id === e.target.value)
                    updateLine(i, 'item_id', e.target.value || undefined)
                    if (inv) {
                      updateLine(i, 'description', inv.name)
                      updateLine(i, 'unit_price', Number(inv.unit_cost))
                    }
                  }}
                  className="w-full bg-white text-slate-900 px-2 py-1.5 rounded text-xs border border-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">— Item —</option>
                  {(inventoryItems as any[]).map((it: any) => (
                    <option key={it.id} value={it.id}>{it.code}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-4">
                <input
                  placeholder="Description *"
                  value={line.description}
                  onChange={e => updateLine(i, 'description', e.target.value)}
                  className="w-full bg-white text-slate-900 px-2 py-1.5 rounded text-xs border border-slate-200 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number" step="0.001" min="0.001" placeholder="Qty"
                  value={line.qty}
                  onChange={e => updateLine(i, 'qty', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white text-slate-900 px-2 py-1.5 rounded text-xs border border-slate-200 focus:border-blue-500 focus:outline-none text-right placeholder:text-slate-400"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number" step="0.01" min="0" placeholder="Unit Price"
                  value={line.unit_price}
                  onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white text-slate-900 px-2 py-1.5 rounded text-xs border border-slate-200 focus:border-blue-500 focus:outline-none text-right placeholder:text-slate-400"
                />
              </div>
              <div className="col-span-1 text-right text-xs text-slate-700 py-2">
                ₹{(line.qty * line.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </div>
              <div className="col-span-1 text-center">
                {form.items.length > 1 && (
                  <button onClick={() => removeLine(i)} className="text-red-500 hover:text-red-600 text-xs py-1.5">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-3 text-right">
          <span className="text-slate-500 text-sm">Subtotal: </span>
          <span className="text-slate-900 font-semibold text-lg ml-2">
            ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          {isNew ? 'Create PO' : 'Save Changes'}
        </button>
        <button onClick={() => router.push('/purchase')} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium">
          Cancel
        </button>
      </div>

      {/* Receive modal */}
      {showReceive && ex && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 w-full max-w-lg space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Receive Items</h2>
            <div className="space-y-2">
              {ex.purchase_order_items?.map((it: any) => (
                <div key={it.id} className="flex items-center gap-3">
                  <div className="flex-1 text-sm text-slate-700">{it.description}</div>
                  <div className="text-xs text-slate-500">Ordered: {it.qty}</div>
                  <input
                    type="number" step="0.001" min="0" max={it.qty}
                    value={received[it.id] ?? 0}
                    onChange={e => setReceived(p => ({ ...p, [it.id]: parseFloat(e.target.value) || 0 }))}
                    className="w-24 bg-white text-slate-900 px-2 py-1 rounded text-sm text-right border border-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => receive.mutate({
                  id,
                  received: Object.entries(received).map(([item_line_id, received_qty]) => ({ item_line_id, received_qty }))
                })}
                disabled={receive.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {receive.isPending ? 'Saving…' : 'Confirm Receipt'}
              </button>
              <button onClick={() => setShowReceive(false)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
