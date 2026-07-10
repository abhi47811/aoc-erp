'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'

const CATEGORIES = ['glass','hardware','consumable','aluminium','other'] as const
const MOVEMENT_TYPES = ['purchase','production_use','sale','adjustment','scrap','return'] as const

type Form = {
  code: string
  name: string
  category: typeof CATEGORIES[number]
  unit: string
  min_stock: number
  unit_cost: number
  notes: string
}

const empty: Form = {
  code: '', name: '', category: 'other', unit: 'pcs', min_stock: 0, unit_cost: 0, notes: '',
}

export default function InventoryItemPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = id === 'new'

  const [form, setForm] = useState<Form>(empty)
  const [showMovement, setShowMovement] = useState(false)
  const [mvForm, setMvForm] = useState({ movement_type: 'purchase' as typeof MOVEMENT_TYPES[number], qty: 0, unit_cost: 0, notes: '' })

  const { data: existing } = trpc.inventory.get.useQuery(id, { enabled: !isNew })
  const create = trpc.inventory.create.useMutation({ onSuccess: () => router.push('/inventory') })
  const update = trpc.inventory.update.useMutation({ onSuccess: () => router.push('/inventory') })
  const addMovement = trpc.inventory.addMovement.useMutation({
    onSuccess: () => { setShowMovement(false); setMvForm({ movement_type: 'purchase', qty: 0, unit_cost: 0, notes: '' }) }
  })

  useEffect(() => {
    if (existing) {
      setForm({
        code: existing.code,
        name: existing.name,
        category: existing.category as typeof CATEGORIES[number],
        unit: existing.unit,
        min_stock: Number(existing.min_stock),
        unit_cost: Number(existing.unit_cost),
        notes: existing.notes ?? '',
      })
    }
  }, [existing])

  function save() {
    if (isNew) {
      create.mutate(form)
    } else {
      update.mutate({ id, data: form })
    }
  }

  const set = (k: keyof Form, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">{isNew ? 'New Inventory Item' : 'Edit Item'}</h1>
        {!isNew && existing && (
          <button
            onClick={() => setShowMovement(true)}
            className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Stock Movement
          </button>
        )}
      </div>

      {!isNew && existing && (
        <div className="bg-zinc-800 rounded-lg p-4 grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-wide">Current Stock</div>
            <div className={`text-2xl font-bold mt-1 ${Number(existing.current_stock) <= Number(existing.min_stock) ? 'text-amber-400' : 'text-zinc-100'}`}>
              {Number(existing.current_stock).toFixed(3)} {existing.unit}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-wide">Stock Value</div>
            <div className="text-2xl font-bold text-zinc-100 mt-1">
              ₹{(Number(existing.current_stock) * Number(existing.unit_cost)).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      )}

      <div className="bg-zinc-800 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Code *</label>
            <input
              value={form.code}
              onChange={e => set('code', e.target.value)}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:border-blue-500 focus:outline-none"
              placeholder="GLASS-001"
              disabled={!isNew}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Unit</label>
            <input
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:border-blue-500 focus:outline-none"
              placeholder="sqm / pcs / kg"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Name *</label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:border-blue-500 focus:outline-none"
            placeholder="Clear Float Glass 4mm"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Category</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:border-blue-500 focus:outline-none"
          >
            {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Min Stock</label>
            <input
              type="number" step="0.001" min="0"
              value={form.min_stock}
              onChange={e => set('min_stock', parseFloat(e.target.value) || 0)}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Unit Cost (₹)</label>
            <input
              type="number" step="0.01" min="0"
              value={form.unit_cost}
              onChange={e => set('unit_cost', parseFloat(e.target.value) || 0)}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:border-blue-500 focus:outline-none"
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

        <div className="flex gap-3 pt-2">
          <button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium">
            {isNew ? 'Create' : 'Save Changes'}
          </button>
          <button onClick={() => router.push('/inventory')} className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-4 py-2 rounded-lg text-sm">
            Cancel
          </button>
        </div>
      </div>

      {/* Recent movements */}
      {!isNew && existing && (existing as any).stock_movements?.length > 0 && (
        <div className="bg-zinc-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Recent Movements</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500">
                <th className="text-left py-1">Type</th>
                <th className="text-right py-1">Qty</th>
                <th className="text-left py-1 pl-4">Notes</th>
                <th className="text-right py-1">Date</th>
              </tr>
            </thead>
            <tbody>
              {((existing as any).stock_movements ?? []).slice(0, 20).map((mv: any) => (
                <tr key={mv.id} className="border-t border-zinc-700/50">
                  <td className="py-1.5 capitalize text-zinc-300">{mv.movement_type.replace('_', ' ')}</td>
                  <td className={`py-1.5 text-right font-mono ${mv.qty > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {mv.qty > 0 ? '+' : ''}{mv.qty}
                  </td>
                  <td className="py-1.5 pl-4 text-zinc-400">{mv.notes ?? '—'}</td>
                  <td className="py-1.5 text-right text-zinc-500">{new Date(mv.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Movement modal */}
      {showMovement && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">Add Stock Movement</h2>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Type</label>
              <select
                value={mvForm.movement_type}
                onChange={e => setMvForm(p => ({ ...p, movement_type: e.target.value as typeof MOVEMENT_TYPES[number] }))}
                className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600"
              >
                {MOVEMENT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace('_', ' ')}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Quantity</label>
                <input
                  type="number" step="0.001"
                  value={mvForm.qty}
                  onChange={e => setMvForm(p => ({ ...p, qty: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Unit Cost</label>
                <input
                  type="number" step="0.01"
                  value={mvForm.unit_cost}
                  onChange={e => setMvForm(p => ({ ...p, unit_cost: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Notes</label>
              <input
                value={mvForm.notes}
                onChange={e => setMvForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600"
                placeholder="Reference or reason"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => addMovement.mutate({ item_id: id, ...mvForm })}
                disabled={addMovement.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {addMovement.isPending ? 'Saving…' : 'Add Movement'}
              </button>
              <button onClick={() => setShowMovement(false)} className="bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
