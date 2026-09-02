'use client'

import { useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
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
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [importError, setImportError] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: records = [], refetch } = trpc.gst.list.useQuery({ period })
  const { data: summary, refetch: refetchSummary } = trpc.gst.summary.useQuery({ period })

  const populate = trpc.gst.populateGSTR1.useMutation({
    onSuccess: () => { refetch(); refetchSummary() },
  })
  const reconcile = trpc.gst.reconcile.useMutation({
    onSuccess: () => { refetch(); refetchSummary(); setAiExplanation(null) },
  })
  const aiExplain = trpc.gst.aiExplainUnmatched.useMutation({
    onSuccess: (d) => setAiExplanation(d.explanation),
  })
  const importGSTR2A = trpc.gst.importGSTR2A.useMutation({
    onSuccess: () => { refetch(); refetchSummary(); setShowImport(false); setGstr2aRows('') },
  })
  const del = trpc.gst.delete.useMutation({
    onSuccess: () => { refetch(); refetchSummary() },
    onError: (e) => setDeleteError(e.message),
  })

  function handleImport() {
    setImportError('')
    try {
      const rows = JSON.parse(gstr2aRows)
      importGSTR2A.mutate({ period, records: rows })
    } catch {
      setImportError('Invalid JSON. Paste an array of {party_gstin, taxable_value, igst, cgst, sgst}.')
    }
  }

  const recs = records as any[]
  const sum = summary as any

  const gstr1 = recs.filter(r => r.return_type === 'gstr1')
  const gstr2a = recs.filter(r => r.return_type === 'gstr2a')

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">GST Reconciliation</h1>
          <p className="text-sm text-slate-500 mt-0.5">GSTR-1 vs GSTR-2A matching</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={period}
            onChange={e => setPeriod(e.target.value)}
            placeholder="MMYYYY"
            maxLength={6}
            className="w-28 bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 text-center"
          />
          <a href="/accounting" className="text-sm text-slate-500 hover:text-slate-700">← Accounting</a>
        </div>
      </div>

      {/* Summary */}
      {sum && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">GSTR-1 (Outward)</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Records</span><span className="text-slate-900 tabular-nums">{sum.gstr1?.count ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Taxable</span><span className="text-slate-900 tabular-nums">₹{sum.gstr1?.taxable?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">CGST</span><span className="text-slate-900 tabular-nums">₹{sum.gstr1?.cgst?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">SGST</span><span className="text-slate-900 tabular-nums">₹{sum.gstr1?.sgst?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">IGST</span><span className="text-slate-900 tabular-nums">₹{sum.gstr1?.igst?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between text-xs mt-2"><span className="text-emerald-600">Matched</span><span className="text-emerald-600 tabular-nums">{sum.gstr1?.matched ?? 0}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">GSTR-2A (Inward)</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Records</span><span className="text-slate-900 tabular-nums">{sum.gstr2a?.count ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Taxable</span><span className="text-slate-900 tabular-nums">₹{sum.gstr2a?.taxable?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">CGST</span><span className="text-slate-900 tabular-nums">₹{sum.gstr2a?.cgst?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">SGST</span><span className="text-slate-900 tabular-nums">₹{sum.gstr2a?.sgst?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">IGST</span><span className="text-slate-900 tabular-nums">₹{sum.gstr2a?.igst?.toFixed(2) ?? '0.00'}</span></div>
              <div className="flex justify-between text-xs mt-2"><span className="text-emerald-600">Matched</span><span className="text-emerald-600 tabular-nums">{sum.gstr2a?.matched ?? 0}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => populate.mutate({ period })}
          disabled={populate.isPending || period.length !== 6}
          className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {populate.isPending ? 'Loading…' : 'Auto-populate GSTR-1 from Invoices'}
        </button>
        <button
          onClick={() => setShowImport(v => !v)}
          className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Import GSTR-2A
        </button>
        <button
          onClick={() => reconcile.mutate({ period })}
          disabled={reconcile.isPending || gstr1.length === 0 || gstr2a.length === 0}
          className="bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {reconcile.isPending ? 'Reconciling…' : 'Run Reconciliation'}
        </button>
        {reconcile.data && (reconcile.data as any).unmatched > 0 && (
          <button
            onClick={() => aiExplain.mutate({
              period,
              unmatched: (reconcile.data as any).unmatched_records ?? [],
            })}
            disabled={aiExplain.isPending}
            className="flex items-center gap-1.5 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-300 text-slate-700 hover:text-violet-700 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          >
            {aiExplain.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <Sparkles size={14} />}
            AI Explain Mismatches
          </button>
        )}
      </div>

      {/* AI Explanation Panel */}
      {aiExplanation && (
        <div className="bg-white rounded-xl border border-violet-200 shadow-elevation-xs p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-violet-600" />
              <span className="font-medium text-slate-900 text-sm">AI Mismatch Analysis</span>
            </div>
            <button onClick={() => setAiExplanation(null)} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{aiExplanation}</p>
        </div>
      )}

      {/* GSTR-2A Import */}
      {showImport && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4 space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Import GSTR-2A — paste JSON array</h3>
          <p className="text-xs text-slate-400">Format: <code>[{'{'}party_gstin, taxable_value, igst, cgst, sgst{'}'}]</code></p>
          {importError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{importError}</p>
          )}
          <textarea
            value={gstr2aRows}
            onChange={e => setGstr2aRows(e.target.value)}
            rows={6}
            placeholder='[{"party_gstin":"29XXXXX","taxable_value":10000,"cgst":900,"sgst":900,"igst":0}]'
            className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 resize-none font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={!gstr2aRows || importGSTR2A.isPending}
              className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {importGSTR2A.isPending ? 'Importing…' : 'Import'}
            </button>
            <button onClick={() => setShowImport(false)} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Records table */}
      {recs.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Records — {periodLabel(period)}</h3>
          {deleteError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{deleteError}</p>
          )}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Party GSTIN</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Taxable</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">CGST</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">SGST</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">IGST</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Matched</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recs.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${r.return_type === 'gstr1' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                        {r.return_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{r.party_gstin ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-800 tabular-nums">₹{Number(r.taxable_value).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-500 tabular-nums">₹{Number(r.cgst ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-500 tabular-nums">₹{Number(r.sgst ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-500 tabular-nums">₹{Number(r.igst ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">{r.matched ? '✓' : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setDeleteError(null); del.mutate(r.id) }} className="text-slate-400 hover:text-red-500 text-xs">✕</button>
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
