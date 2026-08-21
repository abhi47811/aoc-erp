'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'

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

export default function AccountingPage() {
  const { data: accounts = [] } = trpc.accounting.listAccounts.useQuery()
  const { data: journals = [] } = trpc.accounting.listJournals.useQuery({ limit: 20 })

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
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Chart of Accounts</h3>
          </div>
          {accts.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-400 mb-3">No accounts yet.</p>
              <Link href="/accounting/accounts/setup" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Set up default accounts &rarr;
              </Link>
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
            <div className="py-10 text-center text-sm text-slate-400">No journal entries yet.</div>
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
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{j.date} {j.description && `· ${j.description}`}</div>
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
          <div className="text-xs text-slate-400">GSTR-1 &middot; GSTR-2A &middot; Reconciliation</div>
        </Link>
        <Link href="/accounting/tally" className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg p-4 transition-all">
          <div className="text-sm font-semibold text-blue-600 mb-1">Tally</div>
          <div className="text-xs text-slate-400">Export journals as Tally XML</div>
        </Link>
        <Link href="/accounting/journal/new" className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg p-4 transition-all">
          <div className="text-sm font-semibold text-slate-700 mb-1">Journal</div>
          <div className="text-xs text-slate-400">Create double-entry journal</div>
        </Link>
        <Link href="/accounting/cashflow" className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg p-4 transition-all col-span-3">
          <div className="text-sm font-semibold text-violet-600 mb-1">AI Cash-Flow</div>
          <div className="text-xs text-slate-400">Claude forecasts cash flow from journal history</div>
        </Link>
      </div>
    </div>
  )
}
