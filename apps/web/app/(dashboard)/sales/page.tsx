'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'

function fmtMoney(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function SalesPage() {
  const { data: leads = [] } = trpc.lead.list.useQuery()
  const { data: quotations = [] } = trpc.quotation.list.useQuery({})
  const { data: invoices = [] } = trpc.invoice.list.useQuery({})

  const openLeads = leads.filter((l: any) => !['won', 'lost'].includes(l.status)).length
  const wonLeads = leads.filter((l: any) => l.status === 'won').length

  const quoteValue = quotations.reduce((s: number, q: any) => s + Number(q.total ?? 0), 0)
  const approvedQuotes = quotations.filter((q: any) => q.status === 'approved')
  const convertedQuotes = quotations.filter((q: any) => q.status === 'converted')
  const conversionRate = quotations.length > 0
    ? Math.round(((approvedQuotes.length + convertedQuotes.length) / quotations.length) * 100)
    : 0

  const invoiceValue = invoices.reduce((s: number, i: any) => s + Number(i.total ?? 0), 0)
  const collected = invoices.reduce((s: number, i: any) => s + Number(i.paid_amount ?? 0), 0)

  const recentQuotes = [...quotations].slice(0, 5)
  const recentInvoices = [...invoices].slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales</h1>
        <p className="text-sm text-slate-500 mt-0.5">Pipeline overview — leads, quotations, and revenue</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Open Leads" value={String(openLeads)} sub={`${wonLeads} won`} />
        <StatCard label="Quotation Value" value={fmtMoney(quoteValue)} sub={`${quotations.length} quotations`} />
        <StatCard label="Conversion Rate" value={`${conversionRate}%`} sub="approved + converted" />
        <StatCard label="Collected" value={fmtMoney(collected)} sub={`of ${fmtMoney(invoiceValue)} invoiced`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Recent Quotations</h3>
            <Link href="/quotations" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all →</Link>
          </div>
          {recentQuotes.length === 0 ? (
            <p className="text-center py-10 text-sm text-slate-400">No quotations yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentQuotes.map((q: any) => (
                <Link key={q.id} href={`/quotations/${q.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{q.number}</p>
                    <p className="text-xs text-slate-400">{q.clients?.name ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-700 tabular-nums">{fmtMoney(Number(q.total ?? 0))}</p>
                    <p className="text-xs text-slate-400 capitalize">{q.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Recent Invoices</h3>
            <Link href="/invoices" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all →</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="text-center py-10 text-sm text-slate-400">No invoices yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentInvoices.map((i: any) => (
                <Link key={i.id} href={`/invoices/${i.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{i.number}</p>
                    <p className="text-xs text-slate-400">{i.clients?.name ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-700 tabular-nums">{fmtMoney(Number(i.total ?? 0))}</p>
                    <p className="text-xs text-slate-400 capitalize">{i.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/leads" className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
          Manage Leads
        </Link>
        <Link href="/quotations/new" className="px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px">
          + New Quotation
        </Link>
      </div>
    </div>
  )
}
