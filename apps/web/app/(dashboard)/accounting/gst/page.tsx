'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'

function periodLabel(p: string) {
  if (p.length !== 6) return p
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(p.slice(0,2)) - 1]} ${p.slice(2)}`
}

function currentPeriod() {
  const d = new Date()
  return String(d.getMonth() + 1).padStart(2, '0') + String(d.getFullYear())
}

export default function GSTPage() {
  const [period, setPeriod] = useState(currentPeriod())
  const [gstr2aRows, setGstr2aRows] = useState('')
  const [showImport, setShowImport] = useState(false)

  const { data: records = [], refetch } = trpc.gst.list.useQuery({ period })
  const { data: summary, refetch: refetchSummary } = trpc.gst.summary.useQuery({ period })

  const populate = trpc.gst.populateGSTR1.useMutation({
    onSuccess: () => { refetch(); refetchSummary() },
  })
  const reconcile = trpc.gst.reconcile.useMutation({
    onSuccess: () => { refetch(); refetchSummary() },
  })
  const importGSTR2A = trpc.gst.importGSTR2A.useMutation({
    onSuccess: () => { refetch(); refetchSummary(); setShowImport(false); setGstr2aRows('') },
  })
  const del = trpc.gst.delete.useMutation({ onSuccess: () => { refetch(); refetchSummary() } })

  function handleImport() {
    try {
      const rows = JSON.parse(gstr2aRows)
      importGSTR2A.mutate({ period, records: rows })
    } catch {
      alert('Invalid JSON. Paste array of {party_gstin, taxable_value, igst, cgst, sgst}')
    }
  }

  const recs = records as any[]
  const sum = summary as any

  const gstr1 = recs.filter(r => r.return_type === 'gstr1')
  const gstr2a = recs.filter(r => r.return_type === 'gstr2a')

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">GST Reconciliation</h1>
          <p className="text-sm text-zinc-400 mt-1">GSTR-1 vs GSTR-2A matching</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={period}
            onChange={e => setPeriod(e.target.value)}
            placeholder="MMYYYY"
            maxLength={6}
            className="w-28 bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:outline-none text-center"
          />
          <a href="/accounting" className="text-zinc-400 hover:text-zinc-200 text-sm">← Accounting</a>
        </div>
      </div>

      {/* Summary */}
      {sum && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-800 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">GSTR-1 (Outward)</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-zinc-400">Records</span><span className="text-zinc-100">{sum.gstr1?.count ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Taxable</span><span className="text-zinc-100">₹{sum.gstr1?.taxable?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">CGST</span><span className="text-zinc-100">₹{sum.gstr1?.cgst?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">SGST</span><span className="text-zinc-100">₹{sum.gstr1?.sgst?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">IGST</span><span className="text-zinc-100">₹{sum.gstr1?.igst?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between text-xs mt-2"><span className="text-green-500">Matched</span><span className="text-green-400">{sum.gstr1?.matched ?? 0}</span></div>
            </div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">GSTR-2A (Inward)</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-zinc-400">Records</span><span className="text-zinc-100">{sum.gstr2a?.count ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Taxable</span><span className="text-zinc-100">₹{sum.gstr2a?.taxable?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">CGST</span><span className="text-zinc-100">₹{sum.gstr2a?.cgst?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">SGST</span><span className="text-zinc-100">₹{sum.gstr2a?.sgst?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">IGST</span><span className="text-zinc-100">₹{sum.gstr2a?.igst?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between text-xs mt-2"><span className="text-green-500">Matched</span><span className="text-green-400">{sum.gstr2a?.matched ?? 0}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => populate.mutate({ period })}
          disabled={populate.isPending || period.length !== 6}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {populate.isPending ? 'Loading…' : 'Auto-populate GSTR-1 from Invoices'}
        </button>
        <button
          onClick={() => setShowImport(v => !v)}
          className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-4 py-2 rounded-lg text-sm"
        >
          Import GSTR-2A
        </button>
        <button
          onClick={() => reconcile.mutate({ period })}
          disabled={reconcile.isPending || gstr1.length === 0 || gstr2a.length === 0}
          className="bg-teal-600/20 hover:bg-teal-600/40 text-teal-300 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {reconcile.isPending ? 'Reconciling…' : 'Run Reconciliation'}
        </button>
      </div>

      {/* GSTR-2A Import */}
      {showImport && (
        <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-zinc-300">Import GSTR-2A — paste JSON array</h3>
          <p className="text-xs text-zinc-500">Format: <code>[{'{'}party_gstin, taxable_value, igst, cgst, sgst{'}'}]</code></p>
          <textarea
            value={gstr2aRows}
            onChange={e => setGstr2aRows(e.target.value)}
            rows={6}
            placeholder='[{"party_gstin":"29XXXXX","taxable_value":10000,"cgst":900,"sgst":900,"igst":0}]'
            className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-xs border border-zinc-600 focus:outline-none resize-none font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={!gstr2aRows || importGSTR2A.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {importGSTR2A.isPending ? 'Importing…' : 'Import'}
            </button>
            <button onClick={() => setShowImport(false)} className="bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Records table */}
      {recs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Records — {periodLabel(period)}</h3>
          <div className="bg-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-500 uppercase tracking-wide border-b border-zinc-700">
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-left px-4 py-2">Party GSTIN</th>
                  <th className="text-right px-4 py-2">Taxable</th>
                  <th className="text-right px-4 py-2">CGST</th>
                  <th className="text-right px-4 py-2">SGST</th>
                  <th className="text-right px-4 py-2">IGST</th>
                  <th className="text-center px-4 py-2">Matched</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {recs.map((r: any) => (
                  <tr key={r.id} className="hover:bg-zinc-700/30">
                    <td className="px-4 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${r.return_type === 'gstr1' ? 'bg-blue-900/40 text-blue-300' : 'bg-amber-900/40 text-amber-300'}`}>
                        {r.return_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-400 text-xs font-mono">{r.party_gstin ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-zinc-200">₹{Number(r.taxable_value).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-zinc-400">₹{Number(r.cgst ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-zinc-400">₹{Number(r.sgst ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-zinc-400">₹{Number(r.igst ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">{r.matched ? '✓' : '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => del.mutate(r.id)} className="text-red-500 hover:text-red-400 text-xs">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
