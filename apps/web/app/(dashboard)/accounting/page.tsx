'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { inputClass, labelClass } from '@/lib/ui/form-classes'
import { useDialogA11y } from '@/lib/use-dialog-a11y'

const TYPE_COLORS: Record<string, string> = {
  asset:     'text-blue-600',
  liability: 'text-red-600',
  equity:    'text-violet-600',
  revenue:   'text-emerald-600',
  expense:   'text-amber-600',
}

const STATUS_COLORS: Record<string, string> = {
  draft:  'bg-slate-100 text-slate-600',
  posted: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  voided: 'bg-red-50 text-red-700 border border-red-100',
}

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const


type NewAccountForm = {
  code: string
  name: string
  account_type: (typeof ACCOUNT_TYPES)[number]
  parent_id: string
}

const emptyAccountForm: NewAccountForm = { code: '', name: '', account_type: 'asset', parent_id: '' }

function NewAccountModal({ accounts, onClose }: { accounts: any[]; onClose: () => void }) {
  const utils = trpc.useUtils()
  const [form, setForm] = useState<NewAccountForm>(emptyAccountForm)
  const [error, setError] = useState('')

  const create = trpc.accounting.createAccount.useMutation({
    onSuccess: () => {
      utils.accounting.listAccounts.invalidate()
      onClose()
    },
    onError: (e) => setError(e.message),
  })

  const set = (k: keyof NewAccountForm, v: string) => setForm(p => ({ ...p, [k]: v }))
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogA11y(true, onClose, dialogRef)

  function save() {
    setError('')
    if (!form.code.trim() || !form.name.trim()) {
      setError('Code and name are required.')
      return
    }
    create.mutate({
      code: form.code.trim(),
      name: form.name.trim(),
      account_type: form.account_type,
      parent_id: form.parent_id || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="new-account-title" className="bg-white rounded-xl border border-slate-200 shadow-elevation-md w-full max-w-md p-6 space-y-4">
        <h2 id="new-account-title" className="text-lg font-bold text-slate-900">New Account</h2>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="new-account-code" className={labelClass}>Code *</label>
            <input id="new-account-code" className={inputClass} value={form.code} onChange={e => set('code', e.target.value)} placeholder="e.g. 1000" />
          </div>
          <div>
            <label htmlFor="new-account-type" className={labelClass}>Type *</label>
            <select id="new-account-type" className={inputClass} value={form.account_type} onChange={e => set('account_type', e.target.value)}>
              {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label htmlFor="new-account-name" className={labelClass}>Name *</label>
            <input id="new-account-name" className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Cash in Hand" />
          </div>
          <div className="col-span-2">
            <label htmlFor="new-account-parent" className={labelClass}>Parent Account</label>
            <select id="new-account-parent" className={inputClass} value={form.parent_id} onChange={e => set('parent_id', e.target.value)}>
              <option value="">— None —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={create.isPending}
            className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {create.isPending ? 'Creating…' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AccountingPage() {
  const { data: accounts = [] } = trpc.accounting.listAccounts.useQuery()
  const { data: journals = [] } = trpc.accounting.listJournals.useQuery({ limit: 20 })
  const [showNewAccount, setShowNewAccount] = useState(false)

  const accts = accounts as any[]
  const jrnls = journals as any[]

  // Group by type
  const byType = (type: string) => accts.filter(a => a.account_type === type)
  const types = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Accounting</h1>
          <p className="text-sm text-slate-500 mt-0.5">Double-entry ledger &middot; GST &middot; Tally sync</p>
        </div>
        <div className="flex gap-3">
          <Link href="/accounting/gst" className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            GST Recon
          </Link>
          <Link href="/accounting/tally" className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Tally Export
          </Link>
          <Link href="/accounting/journal/new" className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + Journal Entry
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Chart of Accounts */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Chart of Accounts</h3>
            <button
              onClick={() => setShowNewAccount(true)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              + Account
            </button>
          </div>
          {accts.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-500">No accounts yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {types.map(type => {
                const group = byType(type)
                if (group.length === 0) return null
                return (
                  <div key={type} className="px-5 py-4">
                    <div className={`text-xs font-medium uppercase tracking-wider mb-2 ${TYPE_COLORS[type]}`}>{type}</div>
                    <div className="space-y-1.5">
                      {group.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{a.code} &mdash; {a.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Journal Entries */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Recent Journal Entries</h3>
          </div>
          {jrnls.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No journal entries yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {jrnls.map((j: any) => (
                <Link
                  key={j.id}
                  href={`/accounting/journal/${j.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{j.number}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{j.date} {j.description && `· ${j.description}`}</div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLORS[j.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {j.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-3 gap-4 pt-2">
        <Link href="/accounting/gst" className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg p-4 transition-all">
          <div className="text-sm font-semibold text-emerald-600 mb-1">GST</div>
          <div className="text-xs text-slate-500">GSTR-1 &middot; GSTR-2A &middot; Reconciliation</div>
        </Link>
        <Link href="/accounting/tally" className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg p-4 transition-all">
          <div className="text-sm font-semibold text-blue-600 mb-1">Tally</div>
          <div className="text-xs text-slate-500">Export journals as Tally XML</div>
        </Link>
        <Link href="/accounting/journal/new" className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg p-4 transition-all">
          <div className="text-sm font-semibold text-slate-700 mb-1">Journal</div>
          <div className="text-xs text-slate-500">Create double-entry journal</div>
        </Link>
        <Link href="/accounting/cashflow" className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg p-4 transition-all col-span-3">
          <div className="text-sm font-semibold text-violet-600 mb-1">AI Cash-Flow</div>
          <div className="text-xs text-slate-500">Claude forecasts cash flow from journal history</div>
        </Link>
      </div>

      {showNewAccount && (
        <NewAccountModal accounts={accts} onClose={() => setShowNewAccount(false)} />
      )}
    </div>
  )
}
