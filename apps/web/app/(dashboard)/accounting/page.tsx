'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'

const TYPE_COLORS: Record<string, string> = {
  asset:     'text-blue-400',
  liability: 'text-red-400',
  equity:    'text-purple-400',
  revenue:   'text-green-400',
  expense:   'text-amber-400',
}

const STATUS_COLORS: Record<string, string> = {
  draft:  'bg-zinc-700 text-zinc-300',
  posted: 'bg-green-900 text-green-300',
  voided: 'bg-red-900/40 text-red-400',
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Accounting</h1>
          <p className="text-sm text-zinc-400 mt-1">Double-entry ledger · GST · Tally sync</p>
        </div>
        <div className="flex gap-3">
          <Link href="/accounting/gst" className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-4 py-2 rounded-lg text-sm">
            GST Recon
          </Link>
          <Link href="/accounting/tally" className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-4 py-2 rounded-lg text-sm">
            Tally Export
          </Link>
          <Link href="/accounting/journal/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Journal Entry
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Chart of Accounts */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Chart of Accounts</h2>
          {accts.length === 0 ? (
            <div className="bg-zinc-800 rounded-lg p-6 text-center">
              <p className="text-zinc-500 text-sm mb-3">No accounts yet.</p>
              <Link href="/accounting/accounts/setup" className="text-blue-400 hover:text-blue-300 text-sm">
                Set up default accounts →
              </Link>
            </div>
          ) : (
            <div className="bg-zinc-800 rounded-lg divide-y divide-zinc-700">
              {types.map(type => {
                const group = byType(type)
                if (group.length === 0) return null
                return (
                  <div key={type} className="p-3">
                    <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${TYPE_COLORS[type]}`}>{type}</div>
                    <div className="space-y-1">
                      {group.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between text-sm">
                          <span className="text-zinc-300">{a.code} — {a.name}</span>
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
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Recent Journal Entries</h2>
          {jrnls.length === 0 ? (
            <div className="bg-zinc-800 rounded-lg p-6 text-center">
              <p className="text-zinc-500 text-sm">No journal entries yet.</p>
            </div>
          ) : (
            <div className="bg-zinc-800 rounded-lg divide-y divide-zinc-700">
              {jrnls.map((j: any) => (
                <Link
                  key={j.id}
                  href={`/accounting/journal/${j.id}`}
                  className="flex items-center justify-between p-3 hover:bg-zinc-700/50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-zinc-100">{j.number}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{j.date} {j.description && `· ${j.description}`}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[j.status] ?? 'bg-zinc-700 text-zinc-300'}`}>
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
        <Link href="/accounting/gst" className="bg-zinc-800 hover:bg-zinc-700 rounded-lg p-4 transition-colors">
          <div className="text-lg font-bold text-green-400 mb-1">GST</div>
          <div className="text-xs text-zinc-400">GSTR-1 · GSTR-2A · Reconciliation</div>
        </Link>
        <Link href="/accounting/tally" className="bg-zinc-800 hover:bg-zinc-700 rounded-lg p-4 transition-colors">
          <div className="text-lg font-bold text-blue-400 mb-1">Tally</div>
          <div className="text-xs text-zinc-400">Export journals as Tally XML</div>
        </Link>
        <Link href="/accounting/journal/new" className="bg-zinc-800 hover:bg-zinc-700 rounded-lg p-4 transition-colors">
          <div className="text-lg font-bold text-zinc-200 mb-1">Journal</div>
          <div className="text-xs text-zinc-400">Create double-entry journal</div>
        </Link>
        <Link href="/accounting/cashflow" className="bg-zinc-800 hover:bg-zinc-700 rounded-lg p-4 transition-colors col-span-3">
          <div className="text-lg font-bold text-purple-400 mb-1">AI Cash-Flow</div>
          <div className="text-xs text-zinc-400">Claude forecasts cash flow from journal history</div>
        </Link>
      </div>
    </div>
  )
}
