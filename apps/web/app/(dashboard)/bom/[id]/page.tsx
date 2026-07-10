'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
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
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Link href="/bom" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">← Bill of Materials</Link>
        <h1 className="text-xl font-semibold text-slate-900">{isNew ? 'New BOM Template' : 'Edit BOM'}</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Template Name *</label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
            placeholder="Clear Float 4mm Standard"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Glass Type</label>
            <input
              value={form.glass_type}
              onChange={e => set('glass_type', e.target.value)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              placeholder="Clear Float / Tinted / Reflective"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Thickness (mm)</label>
            <input
              type="number" step="0.5" min="3"
              value={form.thickness_mm}
              onChange={e => set('thickness_mm', e.target.value)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              placeholder="4"
            />
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

      {/* Material lines */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-900">Materials per sqm</h3>
          <button onClick={addItem} className="text-blue-600 hover:text-blue-700 text-xs font-medium">+ Add Material</button>
        </div>

        {form.items.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">No materials added yet</p>
        )}

        {form.items.length > 0 && (
          <div className="divide-y divide-slate-100">
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center px-4 py-3">
                <div className="col-span-5">
                  <select
                    value={item.item_id}
                    onChange={e => updateItem(i, 'item_id', e.target.value)}
                    className="w-full bg-white text-slate-900 px-2 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full bg-white text-slate-900 px-2 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right placeholder:text-slate-400"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    placeholder="Notes"
                    value={item.notes}
                    onChange={e => updateItem(i, 'notes', e.target.value)}
                    className="w-full bg-white text-slate-900 px-2 py-1.5 rounded-lg text-xs border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                  />
                </div>
                <div className="col-span-1 text-center">
                  <button onClick={() => removeItem(i)} className="text-slate-400 hover:text-red-500 text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
          {isNew ? 'Create BOM' : 'Save Changes'}
        </button>
        <button onClick={() => router.push('/bom')} className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-all">
          Cancel
        </button>
      </div>

      {/* Cost calculator — only for existing BOMs */}
      {!isNew && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-medium text-slate-900">Cost Calculator</h3>
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Area (sqm)</label>
              <input
                type="number" step="0.01" min="0.01"
                value={calcArea}
                onChange={e => setCalcArea(parseFloat(e.target.value) || 1)}
                className="w-32 bg-white text-slate-900 px-2 py-1.5 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={runCalc}
              disabled={calcFetching}
              className="mt-5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {calcFetching ? 'Calculating…' : 'Calculate'}
            </button>
          </div>

          {calcResult && (
            <div className="space-y-1 pt-2">
              {calcResult.lines?.map((l: any, i: number) => (
                <div key={i} className="flex justify-between text-xs text-slate-600">
                  <span>{l.name}</span>
                  <span>{l.qty.toFixed(3)} {l.unit} × ₹{l.unit_cost} = <strong className="text-slate-900">₹{l.line_cost.toFixed(2)}</strong></span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold text-slate-900 border-t border-slate-100 pt-2 mt-2">
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
