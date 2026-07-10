'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'

type BomItem = { item_id: string; qty_per_sqm: number; notes: string }

type Form = {
  name: string
  glass_type: string
  thickness_mm: string
  notes: string
  items: BomItem[]
}

const empty: Form = {
  name: '',
  glass_type: '',
  thickness_mm: '',
  notes: '',
  items: [],
}

export default function BOMEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = id === 'new'

  const [form, setForm] = useState<Form>(empty)
  const [calcArea, setCalcArea] = useState(1)
  const [calcParams, setCalcParams] = useState<{ bom_id: string; area_sqm: number } | null>(null)

  const { data: existing } = trpc.bom.get.useQuery(id, { enabled: !isNew })
  const { data: inventoryItems = [] } = trpc.inventory.list.useQuery({ category: '' })
  const create = trpc.bom.create.useMutation({ onSuccess: () => router.push('/bom') })
  const update = trpc.bom.update.useMutation({ onSuccess: () => router.push('/bom') })
  const { data: calcResult, isFetching: calcFetching } = trpc.bom.calcCost.useQuery(
    calcParams!,
    { enabled: !!calcParams && !isNew }
  )

  useEffect(() => {
    if (existing) {
      const ex = existing as any
      setForm({
        name: ex.name,
        glass_type: ex.glass_type ?? '',
        thickness_mm: ex.thickness_mm ?? '',
        notes: ex.notes ?? '',
        items: (ex.bom_items?.map((bi: any) => ({
          item_id: bi.item_id as string,
          qty_per_sqm: Number(bi.qty_per_sqm),
          notes: bi.notes ?? '',
        })) ?? []) as BomItem[],
      })
    }
  }, [existing])

  const set = (k: keyof Form, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  function updateItem(i: number, k: keyof BomItem, v: unknown) {
    const items = [...form.items]
    items[i] = { ...items[i], [k]: v } as BomItem
    setForm(p => ({ ...p, items }))
  }

  function addItem() {
    setForm(p => ({ ...p, items: [...p.items, { item_id: '', qty_per_sqm: 0, notes: '' }] }))
  }

  function removeItem(i: number) {
    setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))
  }

  function save() {
    const payload = {
      ...form,
      thickness_mm: form.thickness_mm ? parseFloat(form.thickness_mm) : undefined,
      items: form.items.filter(it => it.item_id),
    }
    if (isNew) {
      create.mutate(payload as any)
    } else {
      update.mutate({ id, data: payload as any })
    }
  }

  function runCalc() {
    setCalcParams({ bom_id: id, area_sqm: calcArea })
  }

  const invMap = Object.fromEntries((inventoryItems as any[]).map((it: any) => [it.id, it]))

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">{isNew ? 'New BOM Template' : 'Edit BOM'}</h1>
      </div>

      <div className="bg-zinc-800 rounded-lg p-6 space-y-4">
        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Template Name *</label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:border-blue-500 focus:outline-none"
            placeholder="Clear Float 4mm Standard"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Glass Type</label>
            <input
              value={form.glass_type}
              onChange={e => set('glass_type', e.target.value)}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:border-blue-500 focus:outline-none"
              placeholder="Clear Float / Tinted / Reflective"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Thickness (mm)</label>
            <input
              type="number" step="0.5" min="3"
              value={form.thickness_mm}
              onChange={e => set('thickness_mm', e.target.value)}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:border-blue-500 focus:outline-none"
              placeholder="4"
            />
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

      {/* Material lines */}
      <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-300">Materials per sqm</h3>
          <button onClick={addItem} className="text-blue-400 hover:text-blue-300 text-xs">+ Add Material</button>
        </div>

        {form.items.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-4">No materials added yet</p>
        )}

        {form.items.map((item, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5">
              <select
                value={item.item_id}
                onChange={e => updateItem(i, 'item_id', e.target.value)}
                className="w-full bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-xs border border-zinc-600"
              >
                <option value="">— Select material —</option>
                {(inventoryItems as any[]).map((it: any) => (
                  <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <input
                type="number" step="0.001" min="0" placeholder="Qty per sqm"
                value={item.qty_per_sqm}
                onChange={e => updateItem(i, 'qty_per_sqm', parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-xs border border-zinc-600 text-right"
              />
            </div>
            <div className="col-span-3">
              <input
                placeholder="Notes"
                value={item.notes}
                onChange={e => updateItem(i, 'notes', e.target.value)}
                className="w-full bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-xs border border-zinc-600"
              />
            </div>
            <div className="col-span-1 text-center">
              <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium">
          {isNew ? 'Create BOM' : 'Save Changes'}
        </button>
        <button onClick={() => router.push('/bom')} className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-4 py-2 rounded-lg text-sm">
          Cancel
        </button>
      </div>

      {/* Cost calculator — only for existing BOMs */}
      {!isNew && (
        <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-zinc-300">Cost Calculator</h3>
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Area (sqm)</label>
              <input
                type="number" step="0.01" min="0.01"
                value={calcArea}
                onChange={e => setCalcArea(parseFloat(e.target.value) || 1)}
                className="w-32 bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-sm border border-zinc-600"
              />
            </div>
            <button
              onClick={runCalc}
              disabled={calcFetching}
              className="mt-5 bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm"
            >
              {calcFetching ? 'Calculating…' : 'Calculate'}
            </button>
          </div>

          {calcResult && (
            <div className="space-y-1 pt-2">
              {calcResult.lines?.map((l: any, i: number) => (
                <div key={i} className="flex justify-between text-xs text-zinc-300">
                  <span>{l.name}</span>
                  <span>{l.qty.toFixed(3)} {l.unit} × ₹{l.unit_cost} = <strong>₹{l.line_cost.toFixed(2)}</strong></span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold text-zinc-100 border-t border-zinc-700 pt-2 mt-2">
                <span>Total Material Cost</span>
                <span>₹{calcResult.total?.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
