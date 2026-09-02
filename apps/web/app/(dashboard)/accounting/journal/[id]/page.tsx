'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

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
  const [confirmAction, setConfirmAction] = useState<'delete' | 'void' | null>(null)

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
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {isNew ? 'New Journal Entry' : `JE ${ex?.number ?? '…'}`}
          </h1>
          {!isNew && (
            <span className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
              ex?.status === 'posted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
              ex?.status === 'voided' ? 'bg-red-50 text-red-700 border border-red-100' :
              'bg-slate-100 text-slate-600'
            }`}>{ex?.status}</span>
          )}
        </div>
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700">← Back</button>
      </div>

      {/* Header fields */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4 grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Number *</label>
          <input
            value={number}
            onChange={e => setNumber(e.target.value)}
            disabled={readOnly}
            placeholder="JE-2026-001"
            className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Date *</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            disabled={readOnly}
            className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Narration</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={readOnly}
            placeholder="e.g. Rent payment"
            className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Lines table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
        <div className="grid grid-cols-12 gap-0 px-4 py-3 border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
          <div className="col-span-4">Account</div>
          <div className="col-span-4">Narration</div>
          <div className="col-span-2 text-right">Debit</div>
          <div className="col-span-2 text-right">Credit</div>
        </div>

        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-12 gap-0 px-4 py-2 border-b border-slate-100 items-center">
            <div className="col-span-4 pr-2">
              <select
                value={line.account_id}
                onChange={e => updateLine(i, 'account_id', e.target.value)}
                disabled={readOnly}
                className="w-full bg-white text-slate-900 px-2 py-1.5 rounded text-xs border border-slate-200 disabled:opacity-50"
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
                className="w-full bg-white text-slate-900 px-2 py-1.5 rounded text-xs border border-slate-200 disabled:opacity-50"
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
                className="w-full bg-white text-slate-900 px-2 py-1.5 rounded text-xs border border-slate-200 text-right tabular-nums disabled:opacity-50"
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
                className="w-full bg-white text-slate-900 px-2 py-1.5 rounded text-xs border border-slate-200 text-right tabular-nums disabled:opacity-50"
              />
            </div>
          </div>
        ))}

        {/* Totals row */}
        <div className="grid grid-cols-12 gap-0 px-4 py-3 bg-slate-50">
          <div className="col-span-8 text-xs text-slate-500 flex items-center gap-2">
            {!readOnly && (
              <button onClick={() => setLines(l => [...l, emptyLine()])} className="text-blue-600 hover:text-blue-700 font-medium">+ Line</button>
            )}
            {!balanced && <span className="text-amber-600 text-xs">⚠ Unbalanced</span>}
            {balanced && lines.some(l => l.account_id) && <span className="text-emerald-600 text-xs">✓ Balanced</span>}
          </div>
          <div className="col-span-2 text-right text-sm font-semibold text-slate-900 tabular-nums pr-1">
            {totalDebit.toFixed(2)}
          </div>
          <div className="col-span-2 text-right text-sm font-semibold text-slate-900 tabular-nums pl-1">
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
            className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {create.isPending ? 'Saving…' : 'Save Draft'}
          </button>
        )}
        {!isNew && ex?.status === 'draft' && (
          <>
            <button
              onClick={() => post.mutate(id)}
              disabled={post.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {post.isPending ? 'Posting…' : 'Post'}
            </button>
            <button
              onClick={() => setConfirmAction('delete')}
              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Delete
            </button>
          </>
        )}
        {!isNew && ex?.status === 'posted' && (
          <button
            onClick={() => setConfirmAction('void')}
            disabled={voidJ.isPending}
            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Void
          </button>
        )}
        <button onClick={() => router.push('/accounting')} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Cancel
        </button>
      </div>
      <ConfirmDialog
        open={confirmAction === 'delete'}
        title="Delete this draft journal entry?"
        description="This can't be undone."
        pending={deleteJ.isPending}
        onConfirm={() => deleteJ.mutate(id)}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === 'void'}
        title="Void this journal entry?"
        description="The entry will be marked voided and excluded from the trial balance. This can't be undone."
        confirmLabel="Void"
        pending={voidJ.isPending}
        onConfirm={() => { voidJ.mutate(id); setConfirmAction(null) }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}
