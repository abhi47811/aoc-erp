'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'

type Line = {
  account_id: string
  debit: string
  credit: string
  description: string
}

const emptyLine = (): Line => ({ account_id: '', debit: '', credit: '', description: '' })

export default function JournalPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = id === 'new'

  const [number, setNumber] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()])

  const { data: accounts = [] } = trpc.accounting.listAccounts.useQuery()
  const { data: existing } = trpc.accounting.getJournal.useQuery(id, { enabled: !isNew })

  const create = trpc.accounting.createJournal.useMutation({ onSuccess: d => router.push(`/accounting/journal/${d.id}`) })
  const post = trpc.accounting.postJournal.useMutation({ onSuccess: () => router.refresh() })
  const voidJ = trpc.accounting.voidJournal.useMutation({ onSuccess: () => router.refresh() })
  const deleteJ = trpc.accounting.deleteJournal.useMutation({ onSuccess: () => router.push('/accounting') })

  useEffect(() => {
    if (existing) {
      const ex = existing as any
      setNumber(ex.number)
      setDate(ex.date)
      setDescription(ex.description ?? '')
      setLines((ex.journal_lines ?? []).map((l: any): Line => ({
        account_id: String(l.account_id ?? ''),
        debit: l.debit > 0 ? String(l.debit) : '',
        credit: l.credit > 0 ? String(l.credit) : '',
        description: String(l.description ?? ''),
      })))
    }
  }, [existing])

  const accts = accounts as any[]
  const ex = existing as any

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01

  function updateLine(i: number, k: keyof Line, v: string) {
    const next = [...lines]
    const updated: Line = { ...next[i], [k]: v } as Line
    if (k === 'debit' && v) updated.credit = ''
    if (k === 'credit' && v) updated.debit = ''
    next[i] = updated
    setLines(next)
  }

  function save() {
    const payload = {
      number,
      date,
      description: description || undefined,
      lines: lines
        .filter(l => l.account_id)
        .map(l => ({
          account_id: l.account_id,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description || undefined,
        })),
    }
    create.mutate(payload)
  }

  const readOnly = !isNew && ex?.status !== 'draft'

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {isNew ? 'New Journal Entry' : `JE ${ex?.number ?? '…'}`}
          </h1>
          {!isNew && (
            <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
              ex?.status === 'posted' ? 'bg-green-900 text-green-300' :
              ex?.status === 'voided' ? 'bg-red-900/40 text-red-400' :
              'bg-zinc-700 text-zinc-300'
            }`}>{ex?.status}</span>
          )}
        </div>
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-zinc-200 text-sm">← Back</button>
      </div>

      {/* Header fields */}
      <div className="bg-zinc-800 rounded-lg p-4 grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Number *</label>
          <input
            value={number}
            onChange={e => setNumber(e.target.value)}
            disabled={readOnly}
            placeholder="JE-2026-001"
            className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:outline-none disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Date *</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            disabled={readOnly}
            className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:outline-none disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Narration</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={readOnly}
            placeholder="e.g. Rent payment"
            className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:outline-none disabled:opacity-50"
          />
        </div>
      </div>

      {/* Lines table */}
      <div className="bg-zinc-800 rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-0 px-4 py-2 border-b border-zinc-700 text-xs text-zinc-500 uppercase tracking-wide">
          <div className="col-span-4">Account</div>
          <div className="col-span-4">Narration</div>
          <div className="col-span-2 text-right">Debit</div>
          <div className="col-span-2 text-right">Credit</div>
        </div>

        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-12 gap-0 px-4 py-2 border-b border-zinc-700/50 items-center">
            <div className="col-span-4 pr-2">
              <select
                value={line.account_id}
                onChange={e => updateLine(i, 'account_id', e.target.value)}
                disabled={readOnly}
                className="w-full bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-xs border border-zinc-600 disabled:opacity-50"
              >
                <option value="">— Account —</option>
                {accts.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.code} {a.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-4 px-1">
              <input
                value={line.description}
                onChange={e => updateLine(i, 'description', e.target.value)}
                disabled={readOnly}
                placeholder="Line note"
                className="w-full bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-xs border border-zinc-600 disabled:opacity-50"
              />
            </div>
            <div className="col-span-2 px-1">
              <input
                type="number"
                min="0"
                value={line.debit}
                onChange={e => updateLine(i, 'debit', e.target.value)}
                disabled={readOnly}
                placeholder="0.00"
                className="w-full bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-xs border border-zinc-600 text-right disabled:opacity-50"
              />
            </div>
            <div className="col-span-2 pl-1">
              <input
                type="number"
                min="0"
                value={line.credit}
                onChange={e => updateLine(i, 'credit', e.target.value)}
                disabled={readOnly}
                placeholder="0.00"
                className="w-full bg-zinc-700 text-zinc-100 px-2 py-1.5 rounded text-xs border border-zinc-600 text-right disabled:opacity-50"
              />
            </div>
          </div>
        ))}

        {/* Totals row */}
        <div className="grid grid-cols-12 gap-0 px-4 py-2 bg-zinc-700/30">
          <div className="col-span-8 text-xs text-zinc-400 flex items-center gap-2">
            {!readOnly && (
              <button onClick={() => setLines(l => [...l, emptyLine()])} className="text-blue-400 hover:text-blue-300">+ Line</button>
            )}
            {!balanced && <span className="text-amber-400 text-xs">⚠ Unbalanced</span>}
            {balanced && lines.some(l => l.account_id) && <span className="text-green-400 text-xs">✓ Balanced</span>}
          </div>
          <div className="col-span-2 text-right text-sm font-semibold text-zinc-200 pr-1">
            {totalDebit.toFixed(2)}
          </div>
          <div className="col-span-2 text-right text-sm font-semibold text-zinc-200 pl-1">
            {totalCredit.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {isNew && (
          <button
            onClick={save}
            disabled={!number || !date || !balanced || lines.filter(l => l.account_id).length < 2 || create.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {create.isPending ? 'Saving…' : 'Save Draft'}
          </button>
        )}
        {!isNew && ex?.status === 'draft' && (
          <>
            <button
              onClick={() => post.mutate(id)}
              disabled={post.isPending}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {post.isPending ? 'Posting…' : 'Post'}
            </button>
            <button
              onClick={() => confirm('Delete this draft?') && deleteJ.mutate(id)}
              className="bg-red-600/20 hover:bg-red-600/40 text-red-400 px-4 py-2 rounded-lg text-sm"
            >
              Delete
            </button>
          </>
        )}
        {!isNew && ex?.status === 'posted' && (
          <button
            onClick={() => confirm('Void this journal entry?') && voidJ.mutate(id)}
            disabled={voidJ.isPending}
            className="bg-red-600/20 hover:bg-red-600/40 text-red-400 px-4 py-2 rounded-lg text-sm"
          >
            Void
          </button>
        )}
        <button onClick={() => router.push('/accounting')} className="bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm">
          Cancel
        </button>
      </div>
    </div>
  )
}
