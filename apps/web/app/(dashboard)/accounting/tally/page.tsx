'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'

export default function TallyPage() {
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = today.slice(0, 8) + '01'

  const [fromDate, setFromDate] = useState(firstOfMonth)
  const [toDate, setToDate] = useState(today)
  const [result, setResult] = useState<{ xml: string; count: number } | null>(null)

  const exportQ = trpc.accounting.tallyExport.useQuery(
    { from_date: fromDate, to_date: toDate },
    { enabled: false }
  )

  async function runExport() {
    const res = await exportQ.refetch()
    if (res.data) setResult(res.data as any)
  }

  function download() {
    if (!result) return
    const blob = new Blob([result.xml], { type: 'text/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tally-journals-${fromDate}-to-${toDate}.xml`
    a.click()
    URL.revokeObjectURL(url)
  }

  function copyXML() {
    if (!result) return
    navigator.clipboard.writeText(result.xml)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tally Sync</h1>
          <p className="text-sm text-slate-500 mt-0.5">Export posted journal entries as Tally XML</p>
        </div>
        <a href="/accounting" className="text-sm text-slate-500 hover:text-slate-700">← Accounting</a>
      </div>

      {/* Date range */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h3 className="text-sm font-medium text-slate-700">Export Range</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
            />
          </div>
        </div>
        <button
          onClick={runExport}
          disabled={exportQ.isFetching}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {exportQ.isFetching ? 'Generating…' : 'Generate Tally XML'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-emerald-600">✓ Ready</span>
              <span className="text-slate-400 text-sm ml-2">{result.count} journal entr{result.count === 1 ? 'y' : 'ies'}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyXML}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                Copy XML
              </button>
              <button
                onClick={download}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                Download .xml
              </button>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 overflow-auto max-h-96">
            <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap">{result.xml}</pre>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-100 p-3">
            <p className="font-medium text-slate-600 mb-1">How to import into Tally:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Open Tally Prime</li>
              <li>Go to Gateway of Tally → Import Data → Vouchers</li>
              <li>Select the downloaded XML file</li>
              <li>Confirm import</li>
            </ol>
          </div>
        </div>
      )}

      {result?.count === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 py-10 text-center">
          <p className="text-slate-400 text-sm">No posted journal entries in selected date range.</p>
        </div>
      )}
    </div>
  )
}
