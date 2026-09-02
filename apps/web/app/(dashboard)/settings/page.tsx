'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'

const EMPTY_FORM = {
  name: '', legal_name: '', gstin: '', mobile: '', email: '',
  state_code: '', invoice_prefix: '', quote_prefix: '', po_prefix: '',
  so_prefix: '', pi_prefix: '', primary_color: '',
}

export default function SettingsPage() {
  const { data: tenant, isLoading, isError, refetch } = trpc.tenant.get.useQuery()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!tenant) return
    setForm({
      name: tenant.name ?? '',
      legal_name: tenant.legal_name ?? '',
      gstin: tenant.gstin ?? '',
      mobile: tenant.mobile ?? '',
      email: tenant.email ?? '',
      state_code: tenant.state_code != null ? String(tenant.state_code) : '',
      invoice_prefix: tenant.invoice_prefix ?? '',
      quote_prefix: tenant.quote_prefix ?? '',
      po_prefix: tenant.po_prefix ?? '',
      so_prefix: tenant.so_prefix ?? '',
      pi_prefix: tenant.pi_prefix ?? '',
      primary_color: tenant.primary_color ?? '',
    })
  }, [tenant])

  const update = trpc.tenant.update.useMutation({
    onSuccess: () => { setSaved(true); refetch(); setTimeout(() => setSaved(false), 2500) },
    onError: (e) => setError(e.message),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    update.mutate({
      name: form.name || undefined,
      legal_name: form.legal_name || undefined,
      gstin: form.gstin || undefined,
      mobile: form.mobile || undefined,
      email: form.email || undefined,
      state_code: form.state_code ? Number(form.state_code) : undefined,
      invoice_prefix: form.invoice_prefix || undefined,
      quote_prefix: form.quote_prefix || undefined,
      po_prefix: form.po_prefix || undefined,
      so_prefix: form.so_prefix || undefined,
      pi_prefix: form.pi_prefix || undefined,
      primary_color: form.primary_color || undefined,
    })
  }

  const inputClass = "w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-red-100 shadow-elevation-xs p-5">
        <p className="text-sm text-red-700">Couldn&apos;t load company settings. Try refreshing the page.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Company profile, GST details, and document numbering</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">Settings saved.</p>}

      <form onSubmit={submit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Company Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Display Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Legal Name</label>
              <input value={form.legal_name} onChange={e => setForm(f => ({ ...f, legal_name: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Mobile</label>
              <input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">GST Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">GSTIN</label>
              <input value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))} placeholder="27AAAPL1234C1Z5" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">State Code</label>
              <input type="number" value={form.state_code} onChange={e => setForm(f => ({ ...f, state_code: e.target.value }))} placeholder="27" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Document Numbering Prefixes</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Quotation</label>
              <input value={form.quote_prefix} onChange={e => setForm(f => ({ ...f, quote_prefix: e.target.value }))} placeholder="QT" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Invoice</label>
              <input value={form.invoice_prefix} onChange={e => setForm(f => ({ ...f, invoice_prefix: e.target.value }))} placeholder="INV" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Purchase Order</label>
              <input value={form.po_prefix} onChange={e => setForm(f => ({ ...f, po_prefix: e.target.value }))} placeholder="PO" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Sales Order</label>
              <input value={form.so_prefix} onChange={e => setForm(f => ({ ...f, so_prefix: e.target.value }))} placeholder="SO" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Proforma Invoice</label>
              <input value={form.pi_prefix} onChange={e => setForm(f => ({ ...f, pi_prefix: e.target.value }))} placeholder="PI" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Branding</h2>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color || '#2563eb'}
                onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer"
              />
              <input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} placeholder="#2563eb" className={inputClass} />
            </div>
          </div>
        </div>

        <button type="submit" disabled={update.isPending}
          className="px-4 py-2.5 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px disabled:opacity-50 transition-colors">
          {update.isPending ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
