'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { NotFoundCard } from '@/components/ui/not-found-card'

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
  const utils = trpc.useUtils()
  const isNew = id === 'new'

  const [form, setForm] = useState<Form>(empty)
  const [showMovement, setShowMovement] = useState(false)
  const [mvForm, setMvForm] = useState({ movement_type: 'purchase' as typeof MOVEMENT_TYPES[number], qty: 0, unit_cost: 0, notes: '' })

  const { data: existing, isError } = trpc.inventory.get.useQuery(id, { enabled: !isNew })
  const create = trpc.inventory.create.useMutation({ onSuccess: () => router.push('/inventory') })
  const update = trpc.inventory.update.useMutation({
    onSuccess: () => {
      utils.inventory.list.invalidate()
      router.push('/inventory')
    },
  })
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

  if (!isNew && isError) return <NotFoundCard entity="inventory item" backHref="/inventory" />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{isNew ? 'New Inventory Item' : 'Edit Item'}</h1>
        {!isNew && existing && (
          <button
            onClick={() => setShowMovement(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Stock Movement
          </button>
        )}
      </div>

      {!isNew && existing && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Current Stock</div>
            <div className={`text-2xl font-semibold tabular-nums ${Number(existing.current_stock) <= Number(existing.min_stock) ? 'text-amber-600' : 'text-slate-900'}`}>
              {Number(existing.current_stock).toFixed(3)} {existing.unit}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Stock Value</div>
            <div className="text-2xl font-semibold text-slate-900 tabular-nums">
              ₹{(Number(existing.current_stock) * Number(existing.unit_cost)).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Code *</label>
            <input
              value={form.code}
              onChange={e => set('code', e.target.value)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              placeholder="GLASS-001"
              disabled={!isNew}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Unit</label>
            <input
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              placeholder="sqm / pcs / kg"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Name *</label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
            placeholder="Clear Float Glass 4mm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Category</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Min Stock</label>
            <input
              type="number" step="0.001" min="0"
              value={form.min_stock}
              onChange={e => set('min_stock', parseFloat(e.target.value) || 0)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Unit Cost (₹)</label>
            <input
              type="number" step="0.01" min="0"
              value={form.unit_cost}
              onChange={e => set('unit_cost', parseFloat(e.target.value) || 0)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={save} className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {isNew ? 'Create' : 'Save Changes'}
          </button>
          <button onClick={() => router.push('/inventory')} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium">
            Cancel
          </button>
        </div>
      </div>

      {/* Recent movements */}
      {!isNew && existing && (existing as any).stock_movements?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Recent Movements</h3>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Notes</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {((existing as any).stock_movements ?? []).slice(0, 20).map((mv: any) => (
                <tr key={mv.id}>
                  <td className="px-4 py-2.5 capitalize text-slate-700">{mv.movement_type.replace('_', ' ')}</td>
                  <td className={`px-4 py-2.5 text-right font-mono ${mv.qty > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {mv.qty > 0 ? '+' : ''}{mv.qty}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{mv.notes ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right text-slate-400">{new Date(mv.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Movement modal */}
      {showMovement && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-elevation-lg animate-fade-in-up p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Add Stock Movement</h2>

            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Type</label>
              <select
                value={mvForm.movement_type}
                onChange={e => setMvForm(p => ({ ...p, movement_type: e.target.value as typeof MOVEMENT_TYPES[number] }))}
                className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MOVEMENT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace('_', ' ')}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Quantity</label>
                <input
                  type="number" step="0.001"
                  value={mvForm.qty}
                  onChange={e => setMvForm(p => ({ ...p, qty: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Unit Cost</label>
                <input
                  type="number" step="0.01"
                  value={mvForm.unit_cost}
                  onChange={e => setMvForm(p => ({ ...p, unit_cost: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Notes</label>
              <input
                value={mvForm.notes}
                onChange={e => setMvForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                placeholder="Reference or reason"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => addMovement.mutate({ item_id: id, ...mvForm })}
                disabled={addMovement.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {addMovement.isPending ? 'Saving…' : 'Add Movement'}
              </button>
              <button onClick={() => setShowMovement(false)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
