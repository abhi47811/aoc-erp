'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'
import { trpc } from '@/lib/trpc'

type WOItem = {
  description: string
  glass_type: string
  thickness_mm: string
  width_mm: string
  height_mm: string
  qty: number
  bom_id: string
}

type Form = {
  number: string
  project_id: string
  client_id: string
  due_date: string
  notes: string
  items: WOItem[]
}

const empty: Form = {
  number: '',
  project_id: '',
  client_id: '',
  due_date: '',
  notes: '',
  items: [],
}

const emptyItem = (): WOItem => ({
  description: '',
  glass_type: '',
  thickness_mm: '',
  width_mm: '',
  height_mm: '',
  qty: 1,
  bom_id: '',
})

const WO_STATUSES = ['draft','cutting','grinding','tempering','laminating','assembly','qc','dispatch','delivered','cancelled'] as const

export default function WorkOrderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = id === 'new'

  const [form, setForm] = useState<Form>(empty)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const { data: existing } = trpc.workOrder.get.useQuery(id, { enabled: !isNew })
  const { data: clients = [] } = trpc.clients.list.useQuery()
  const { data: projects = [] } = trpc.project.list.useQuery()
  const { data: boms = [] } = trpc.bom.list.useQuery()

  const create = trpc.workOrder.create.useMutation({ onSuccess: () => router.push('/work-orders') })
  const update = trpc.workOrder.update.useMutation({ onSuccess: () => router.push('/work-orders') })
  const updateStatus = trpc.workOrder.updateStatus.useMutation({ onSuccess: () => router.refresh() })

  useEffect(() => {
    if (existing) {
      const ex = existing as any
      setForm({
        number: ex.number,
        project_id: ex.project_id ?? '',
        client_id: ex.client_id ?? '',
        due_date: ex.due_date ?? '',
        notes: ex.notes ?? '',
        items: (ex.work_order_items ?? []).map((it: any) => ({
          description: it.description,
          glass_type: it.glass_type ?? '',
          thickness_mm: it.thickness_mm ?? '',
          width_mm: it.width_mm ?? '',
          height_mm: it.height_mm ?? '',
          qty: Number(it.qty),
          bom_id: it.bom_id ?? '',
        })),
      })
    }
  }, [existing])

  useEffect(() => {
    if (!isNew) QRCode.toDataURL(id).then(setQrDataUrl)
  }, [id, isNew])

  const set = (k: keyof Form, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  function updateItem(i: number, k: keyof WOItem, v: unknown) {
    const items = [...form.items]
    items[i] = { ...items[i], [k]: v } as WOItem
    setForm(p => ({ ...p, items }))
  }

  function save() {
    const payload = {
      ...form,
      project_id: form.project_id || undefined,
      client_id: form.client_id || undefined,
      due_date: form.due_date || undefined,
      notes: form.notes || undefined,
      items: form.items.filter(it => it.description).map(it => ({
        ...it,
        thickness_mm: it.thickness_mm ? parseFloat(it.thickness_mm) : undefined,
        width_mm: it.width_mm ? parseFloat(it.width_mm) : undefined,
        height_mm: it.height_mm ? parseFloat(it.height_mm) : undefined,
        bom_id: it.bom_id || undefined,
        glass_type: it.glass_type || undefined,
      })),
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
        <div className="space-y-1">
          <Link href="/work-orders" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">← Work Orders</Link>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {isNew ? 'New Work Order' : `WO #${ex?.number ?? '…'}`}
          </h1>
        </div>
        {!isNew && (
          <div className="flex items-center gap-3">
            <select
              value={ex?.status ?? 'draft'}
              onChange={e => updateStatus.mutate({ id, status: e.target.value as any })}
              className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {WO_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!isNew && qrDataUrl && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 flex items-center gap-4">
          <img src={qrDataUrl} alt="Work order QR code" className="w-24 h-24" />
          <div>
            <p className="text-sm font-medium text-slate-900">Scan to update production status</p>
            <p className="text-xs text-slate-400 mt-0.5">Encodes work order ID for the mobile scan app</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">WO Number *</label>
            <input
              value={form.number}
              onChange={e => set('number', e.target.value)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              placeholder="WO-2026-001"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => set('due_date', e.target.value)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Client</label>
            <select
              value={form.client_id}
              onChange={e => set('client_id', e.target.value)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select client —</option>
              {(clients as any[]).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Project</label>
            <select
              value={form.project_id}
              onChange={e => set('project_id', e.target.value)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select project —</option>
              {(projects as any[]).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-900">Glass Items</h3>
          <button
            onClick={() => setForm(p => ({ ...p, items: [...p.items, emptyItem()] }))}
            className="text-blue-600 hover:text-blue-700 text-xs font-medium"
          >+ Add Item</button>
        </div>

        {form.items.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">No items added yet</p>
        )}

        {form.items.length > 0 && (
          <div className="divide-y divide-slate-100">
            {form.items.map((item, i) => (
              <div key={i} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Item {i + 1}</span>
                  <button onClick={() => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))}
                    className="text-slate-400 hover:text-red-500 text-xs font-medium">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <input
                      placeholder="Description *"
                      value={item.description}
                      onChange={e => updateItem(i, 'description', e.target.value)}
                      className="w-full bg-white text-slate-900 px-2 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                    />
                  </div>
                  <input placeholder="Glass Type" value={item.glass_type}
                    onChange={e => updateItem(i, 'glass_type', e.target.value)}
                    className="bg-white text-slate-900 px-2 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400" />
                  <input type="number" placeholder="Thickness (mm)" value={item.thickness_mm}
                    onChange={e => updateItem(i, 'thickness_mm', e.target.value)}
                    className="bg-white text-slate-900 px-2 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400" />
                  <input type="number" placeholder="Width (mm)" value={item.width_mm}
                    onChange={e => updateItem(i, 'width_mm', e.target.value)}
                    className="bg-white text-slate-900 px-2 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400" />
                  <input type="number" placeholder="Height (mm)" value={item.height_mm}
                    onChange={e => updateItem(i, 'height_mm', e.target.value)}
                    className="bg-white text-slate-900 px-2 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400" />
                  <input type="number" min={1} placeholder="Qty" value={item.qty}
                    onChange={e => updateItem(i, 'qty', parseFloat(e.target.value) || 1)}
                    className="bg-white text-slate-900 px-2 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400" />
                  <select value={item.bom_id}
                    onChange={e => updateItem(i, 'bom_id', e.target.value)}
                    className="bg-white text-slate-900 px-2 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— BOM Template (optional) —</option>
                    {(boms as any[]).map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={save} className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-6 py-2 rounded-lg text-sm font-medium transition-colors">
          {isNew ? 'Create Work Order' : 'Save Changes'}
        </button>
        <button onClick={() => router.push('/work-orders')} className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-all">
          Cancel
        </button>
        {!isNew && (
          <div className="ml-auto flex gap-3">
            <a href={`/qc/${id}`} className="bg-teal-50 hover:bg-teal-100 border border-teal-100 text-teal-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              QC Checklist
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
