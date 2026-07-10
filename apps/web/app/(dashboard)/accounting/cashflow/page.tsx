'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'

type ForecastMonth = {
  month: string
  inflow: number
  outflow: number
  net: number
  note: string
}

type ForecastResult = {
  summary: string
  recommendation: string
  forecast: ForecastMonth[]
}

function monthLabel(m: string) {
  if (!m || m.length < 7) return m
  const [year = '', mon = ''] = m.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(mon) - 1]} ${year}`
}

export default function CashFlowPage() {
  const [months, setMonths] = useState(3)
  const [result, setResult] = useState<ForecastResult | null>(null)

  const forecast = trpc.accounting.cashFlowForecast.useMutation({
    onSuccess: (data) => setResult(data as ForecastResult),
  })

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">AI Cash-Flow Forecast</h1>
          <p className="text-sm text-zinc-400 mt-1">Claude analyzes historical journals to forecast cash flow</p>
        </div>
        <a href="/accounting" className="text-zinc-400 hover:text-zinc-200 text-sm">← Accounting</a>
      </div>

      {/* Config */}
      <div className="bg-zinc-800 rounded-lg p-4 flex items-end gap-4">
        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">Forecast Horizon</label>
          <select
            value={months}
            onChange={e => setMonths(Number(e.target.value))}
            className="bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:outline-none"
          >
            <option value={1}>1 month</option>
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
          </select>
        </div>
        <button
          onClick={() => forecast.mutate({ months })}
          disabled={forecast.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {forecast.isPending ? (
            <>
              <span className="animate-spin text-xs">⟳</span>
              Forecasting…
            </>
          ) : (
            'Generate AI Forecast'
          )}
        </button>
        <p className="text-xs text-zinc-500">Uses last 6 months of posted journals</p>
      </div>

      {forecast.error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
          {forecast.error.message}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-zinc-800 rounded-lg p-4 border border-blue-800/40">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400 text-sm font-semibold">AI Analysis</span>
              <span className="text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">Claude Haiku</span>
            </div>
            <p className="text-zinc-200 text-sm leading-relaxed">{result.summary}</p>
            {result.recommendation && (
              <div className="mt-3 bg-amber-900/20 border border-amber-800/40 rounded p-3">
                <p className="text-xs font-semibold text-amber-400 mb-1">Recommendation</p>
                <p className="text-zinc-300 text-sm">{result.recommendation}</p>
              </div>
            )}
          </div>

          {/* Forecast table */}
          {result.forecast.length > 0 && (
            <div className="bg-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-200">{months}-Month Forecast</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 uppercase tracking-wide border-b border-zinc-700">
                    <th className="text-left px-4 py-2">Month</th>
                    <th className="text-right px-4 py-2">Inflow</th>
                    <th className="text-right px-4 py-2">Outflow</th>
                    <th className="text-right px-4 py-2">Net</th>
                    <th className="text-left px-4 py-2">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                  {result.forecast.map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-700/30">
                      <td className="px-4 py-3 font-medium text-zinc-200">{monthLabel(row.month)}</td>
                      <td className="px-4 py-3 text-right text-green-400">₹{Number(row.inflow).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-red-400">₹{Number(row.outflow).toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${row.net >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {row.net >= 0 ? '+' : ''}₹{Number(row.net).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-600 bg-zinc-700/30">
                    <td className="px-4 py-2 text-xs font-semibold text-zinc-400">Total</td>
                    <td className="px-4 py-2 text-right text-green-400 font-semibold text-xs">
                      ₹{result.forecast.reduce((s, r) => s + Number(r.inflow), 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right text-red-400 font-semibold text-xs">
                      ₹{result.forecast.reduce((s, r) => s + Number(r.outflow), 0).toLocaleString()}
                    </td>
                    <td className={`px-4 py-2 text-right font-bold text-xs ${
                      result.forecast.reduce((s, r) => s + Number(r.net), 0) >= 0 ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {result.forecast.reduce((s, r) => s + Number(r.net), 0) >= 0 ? '+' : ''}
                      ₹{result.forecast.reduce((s, r) => s + Number(r.net), 0).toLocaleString()}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {!result && !forecast.isPending && (
        <div className="bg-zinc-800 rounded-lg p-8 text-center">
          <div className="text-3xl mb-3">📊</div>
          <p className="text-zinc-400 text-sm">Click "Generate AI Forecast" to analyze your cash flow trends</p>
          <p className="text-zinc-600 text-xs mt-1">Requires at least some posted journal entries</p>
        </div>
      )}
    </div>
  )
}
