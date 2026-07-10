'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">
          {isNew ? 'New Work Order' : `WO #${ex?.number ?? '…'}`}
        </h1>
        {!isNew && (
          <div className="flex items-center gap-3">
            <select
              value={ex?.status ?? 'draft'}
              onChange={e => updateStatus.mutate({ id, status: e.target.value as any })}
              className="bg-zinc-700 text-zinc-100 px-3 py-1.5 rounded-lg text-sm border border-zinc-600"
            >
              {WO_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="bg-zinc-800 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">WO Number *</label>
            <input
              value={form.number}
              onChange={e => set('number', e.target.value)}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:border-blue-500 focus:outline-none"
              placeholder="WO-2026-001"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => set('due_date', e.target.value)}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Client</label>
            <select
              value={form.client_id}
              onChange={e => set('client_id', e.target.value)}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600"
            >
              <option value="">— Select client —</option>
              {(clients as any[]).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Project</label>
            <select
              value={form.project_id}
              onChange={e => set('project_id', e.target.value)}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600"
            >
              <option value="">— Select project —</option>
              {(projects as any[]).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:border-blue-500 focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* Line items */}
      <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-300">Glass Items</h3>
          <button
            onClick={() => setForm(p => ({ ...p, items: [...p.items, emptyItem()] }))}
            className="text-blue-400 hover:text-blue-300 text-xs"
          >+ Add Item</button>
        </div>

        {form.items.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-4">No items added yet</p>
        )}

        {form.items.map((item, i) => (
          <div key={i} className="bg-zinc-700/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Item {i + 1}</span>
              <button onClick={() => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))}
                className="text-red-400 hover:text-red-300 text-xs">Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <input
                  placeholder="Description *"
                  value={item.description}
                  onChange={e => updateItem(i, 'description', e.target.value)}
                  className="w-full bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-xs border border-zinc-600"
                />
              </div>
              <input placeholder="Glass Type" value={item.glass_type}
                onChange={e => updateItem(i, 'glass_type', e.target.value)}
                className="bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-xs border border-zinc-600" />
              <input type="number" placeholder="Thickness (mm)" value={item.thickness_mm}
                onChange={e => updateItem(i, 'thickness_mm', e.target.value)}
                className="bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-xs border border-zinc-600" />
              <input type="number" placeholder="Width (mm)" value={item.width_mm}
                onChange={e => updateItem(i, 'width_mm', e.target.value)}
                className="bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-xs border border-zinc-600" />
              <input type="number" placeholder="Height (mm)" value={item.height_mm}
                onChange={e => updateItem(i, 'height_mm', e.target.value)}
                className="bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-xs border border-zinc-600" />
              <input type="number" min={1} placeholder="Qty" value={item.qty}
                onChange={e => updateItem(i, 'qty', parseFloat(e.target.value) || 1)}
                className="bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-xs border border-zinc-600" />
              <select value={item.bom_id}
                onChange={e => updateItem(i, 'bom_id', e.target.value)}
                className="bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-xs border border-zinc-600">
                <option value="">— BOM Template (optional) —</option>
                {(boms as any[]).map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium">
          {isNew ? 'Create Work Order' : 'Save Changes'}
        </button>
        <button onClick={() => router.push('/work-orders')} className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-4 py-2 rounded-lg text-sm">
          Cancel
        </button>
        {!isNew && (
          <div className="ml-auto flex gap-3">
            <a href={`/qc/${id}`} className="bg-teal-700 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm">
              QC Checklist
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
