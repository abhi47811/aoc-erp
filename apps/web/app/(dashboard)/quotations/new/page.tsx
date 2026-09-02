'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'

type LineItem = {
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
  description: '', qty: 1, unit: 'nos', width_mm: '', height_mm: '', glass_type: '', thickness_mm: '', unit_price: 0,
}

function calcAmount(item: LineItem) {
  return item.qty * item.unit_price
}

function calcArea(item: LineItem) {
  if (!item.width_mm || !item.height_mm) return null
  return (item.qty * Number(item.width_mm) * Number(item.height_mm)) / 1_000_000
}

function fmtMoney(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Default markup applied on top of glass cost to suggest a sell price.
// TODO: make this tenant-configurable in Settings; hardcoded to a common
// glass-fabrication margin for now so quotes don't default to ₹0.
const DEFAULT_MARGIN_PCT = 35

// Best-effort match against priced glass inventory: parse thickness from
// the free-text item name (no structured thickness column exists), require
// it within 0.5mm of the requested thickness, then prefer whichever match
// shares a construction keyword (toughened/laminated/float/etc.) with the
// AI-extracted glass_type. Never invents a price for an unmatched item --
// returns null and the field stays 0, editable, same as today.
function suggestUnitPrice(
  glassInventory: Array<{ name: string; unit_cost: number | string; unit?: string | null }>,
  glassType: string,
  thicknessMm: number,
  widthMm: number,
  heightMm: number
): number | null {
  if (!thicknessMm || !widthMm || !heightMm || glassInventory.length === 0) return null

  const candidates = glassInventory
    .map(item => {
      const m = item.name.match(/(\d+(?:\.\d+)?)\s*mm/i)
      if (!m) return null
      // Capturing group always matches when `m` is truthy for this pattern.
      const thickness = parseFloat(m[1]!)
      if (Math.abs(thickness - thicknessMm) > 0.5) return null
      return { item, thickness }
    })
    .filter((c): c is { item: typeof glassInventory[number]; thickness: number } => c !== null)

  if (candidates.length === 0) return null

  const typeWords = glassType.toLowerCase().split(/[\s+/,-]+/).filter(w => w.length > 3)
  const withKeywordMatch = candidates.filter(c =>
    typeWords.some(w => c.item.name.toLowerCase().includes(w))
  )
  const best = (withKeywordMatch.length > 0 ? withKeywordMatch : candidates)
    .sort((a, b) => Math.abs(a.thickness - thicknessMm) - Math.abs(b.thickness - thicknessMm))[0]
  if (!best) return null

  const perPieceAreaSqm = (widthMm * heightMm) / 1_000_000
  const costPerSqm = Number(best.item.unit_cost) || 0
  const sellPricePerSqm = costPerSqm * (1 + DEFAULT_MARGIN_PCT / 100)
  return Math.round(perPieceAreaSqm * sellPricePerSqm * 100) / 100
}

export default function NewQuotationPage() {
  return (
    <Suspense fallback={null}>
      <NewQuotationForm />
    </Suspense>
  )
}

function NewQuotationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillProjectId = searchParams.get('project_id') ?? ''
  const prefillDrawingId = searchParams.get('drawing_id')

  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState(prefillProjectId)
  const [number, setNumber] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }])
  const [prefillBanner, setPrefillBanner] = useState(false)
  const [error, setError] = useState('')

  const { data: clients = [] } = trpc.clients.list.useQuery({ active_only: true })
  const { data: projects = [] } = trpc.project.list.useQuery({})
  const { data: drawings = [] } = trpc.drawing.list.useQuery(prefillProjectId, { enabled: !!prefillProjectId })
  const { data: inventory = [] } = trpc.inventory.list.useQuery({ category: 'glass' })

  const project = useMemo(() => projects.find((p: any) => p.id === projectId), [projects, projectId])

  // Auto-fill client from project, and pre-fill from drawing if provided.
  useEffect(() => {
    if (project?.client_id && !clientId) setClientId(project.client_id as string)
  }, [project, clientId])

  useEffect(() => {
    if (!prefillDrawingId || prefillBanner) return
    const drawing = drawings.find((d: any) => d.id === prefillDrawingId)
    if (!drawing || drawing.ai_status !== 'done' || !drawing.ai_extracted) return

    const extracted = drawing.ai_extracted as {
      items?: Array<{ description: string; qty: number; width_mm: number; height_mm: number; glass_type: string; thickness_mm: number | null; notes: string | null }>
    }
    if (extracted.items && extracted.items.length > 0) {
      setItems(extracted.items.map(it => {
        const suggested = suggestUnitPrice(
          inventory as Array<{ name: string; unit_cost: number | string }>,
          it.glass_type ?? '',
          it.thickness_mm ?? 0,
          it.width_mm ?? 0,
          it.height_mm ?? 0
        )
        return {
          description: it.description || 'Glass panel',
          qty: it.qty || 1,
          unit: 'nos',
          width_mm: it.width_mm ?? '',
          height_mm: it.height_mm ?? '',
          glass_type: it.glass_type ?? '',
          thickness_mm: it.thickness_mm ?? '',
          unit_price: suggested ?? 0,
        }
      }))
      setPrefillBanner(true)
    }
  }, [drawings, prefillDrawingId, prefillBanner, inventory])

  const createQuotation = trpc.quotation.create.useMutation({
    onSuccess: (q: any) => router.push(`/quotations/${q.id}`),
    onError: (err) => setError(err.message),
  })

  const updateItem = (i: number, patch: Partial<LineItem>) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }
  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }])
  const removeItem = (i: number) => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)

  const subtotal = items.reduce((s, it) => s + calcAmount(it), 0)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const validItems = items.filter(it => it.description.trim().length > 0)
    if (validItems.length === 0) { setError('Add at least one line item'); return }
    if (!number.trim()) { setError('Quotation number is required'); return }

    createQuotation.mutate({
      client_id: clientId || undefined,
      project_id: projectId || undefined,
      number: number.trim(),
      status: 'draft',
      valid_until: validUntil || undefined,
      notes: notes || undefined,
      items: validItems.map((it, i) => ({
        description: it.description,
        qty: it.qty,
        unit: it.unit || undefined,
        width_mm: it.width_mm === '' ? undefined : Number(it.width_mm),
        height_mm: it.height_mm === '' ? undefined : Number(it.height_mm),
        glass_type: it.glass_type || undefined,
        thickness_mm: it.thickness_mm === '' ? undefined : Number(it.thickness_mm),
        unit_price: it.unit_price,
        sort_order: i,
      })),
    })
  }

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">New Quotation</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create a quotation and its line items</p>
        </div>
        <button onClick={() => router.push('/quotations')} className="text-sm text-slate-500 hover:text-slate-700">← Quotations</button>
      </div>

      {prefillBanner && (
        <div className="bg-violet-50 border border-violet-100 rounded-lg px-4 py-3 text-sm text-violet-700">
          Line items pre-filled from AI-extracted drawing measurements. Unit prices are suggested from matching priced
          glass inventory + {DEFAULT_MARGIN_PCT}% margin where a match was found — review dimensions and prices before saving;
          items with no inventory match are left at ₹0 for manual entry.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={submit} className="space-y-6">
        {/* Header fields */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="quotation-number" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Quotation No. *</label>
            <input id="quotation-number" value={number} onChange={e => setNumber(e.target.value)} required placeholder="QT-2026-001" className={inputClass} />
          </div>
          <div>
            <label htmlFor="quotation-client" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Client</label>
            <select id="quotation-client" value={clientId} onChange={e => setClientId(e.target.value)} className={inputClass}>
              <option value="">— Select client —</option>
              {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="quotation-project" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Project</label>
            <select id="quotation-project" value={projectId} onChange={e => setProjectId(e.target.value)} className={inputClass}>
              <option value="">— None —</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="quotation-valid-until" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Valid Until</label>
            <input id="quotation-valid-until" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Line Items</h3>
            <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Item</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Description', 'Qty', 'W (mm)', 'H (mm)', 'Glass Type', 'Thick.', 'Unit Price', 'Amount', ''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, i) => {
                  const area = calcArea(item)
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <input value={item.description} onChange={e => updateItem(i, { description: e.target.value })}
                          placeholder="Panel description" className={inputClass} />
                      </td>
                      <td className="px-3 py-2 w-20">
                        <input type="number" min="1" value={item.qty} onChange={e => updateItem(i, { qty: Number(e.target.value) || 1 })} className={inputClass} />
                      </td>
                      <td className="px-3 py-2 w-24">
                        <input type="number" value={item.width_mm} onChange={e => updateItem(i, { width_mm: e.target.value === '' ? '' : Number(e.target.value) })} className={inputClass} />
                      </td>
                      <td className="px-3 py-2 w-24">
                        <input type="number" value={item.height_mm} onChange={e => updateItem(i, { height_mm: e.target.value === '' ? '' : Number(e.target.value) })} className={inputClass} />
                      </td>
                      <td className="px-3 py-2 w-36">
                        <input value={item.glass_type} onChange={e => updateItem(i, { glass_type: e.target.value })} placeholder="Clear Toughened" className={inputClass} />
                      </td>
                      <td className="px-3 py-2 w-20">
                        <input type="number" value={item.thickness_mm} onChange={e => updateItem(i, { thickness_mm: e.target.value === '' ? '' : Number(e.target.value) })} className={inputClass} />
                      </td>
                      <td className="px-3 py-2 w-28">
                        <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, { unit_price: Number(e.target.value) || 0 })} className={inputClass} />
                      </td>
                      <td className="px-3 py-2 text-slate-700 tabular-nums whitespace-nowrap">
                        {fmtMoney(calcAmount(item))}
                        {area !== null && <div className="text-xs text-slate-500">{area.toFixed(2)} m²</div>}
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => removeItem(i)} className="text-slate-500 hover:text-red-500 text-xs">Remove</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
            <div className="text-sm text-slate-500">Subtotal: <span className="text-slate-900 font-semibold tabular-nums">{fmtMoney(subtotal)}</span></div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5">
          <label htmlFor="quotation-notes" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Notes / Terms</label>
          <textarea id="quotation-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputClass} placeholder="Payment terms, delivery notes, etc." />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => router.push('/quotations')}
            className="px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={createQuotation.isPending}
            className="px-4 py-2.5 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px disabled:opacity-50 transition-colors">
            {createQuotation.isPending ? 'Saving…' : 'Create Quotation'}
          </button>
        </div>
      </form>
    </div>
  )
}
