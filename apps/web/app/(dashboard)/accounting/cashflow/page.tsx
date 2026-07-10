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
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">AI Cash-Flow Forecast</h1>
          <p className="text-sm text-slate-500 mt-0.5">Claude analyzes historical journals to forecast cash flow</p>
        </div>
        <a href="/accounting" className="text-sm text-slate-500 hover:text-slate-700">← Accounting</a>
      </div>

      {/* Config */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-end gap-4">
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Forecast Horizon</label>
          <select
            value={months}
            onChange={e => setMonths(Number(e.target.value))}
            className="bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
          >
            <option value={1}>1 month</option>
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
          </select>
        </div>
        <button
          onClick={() => forecast.mutate({ months })}
          disabled={forecast.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
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
        <p className="text-xs text-slate-400">Uses last 6 months of posted journals</p>
      </div>

      {forecast.error && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-red-700 text-sm">
          {forecast.error.message}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-white rounded-xl border border-blue-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600 text-sm font-semibold">AI Analysis</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">Claude Haiku</span>
            </div>
            <p className="text-slate-700 text-sm leading-relaxed">{result.summary}</p>
            {result.recommendation && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Recommendation</p>
                <p className="text-slate-700 text-sm">{result.recommendation}</p>
              </div>
            )}
          </div>

          {/* Forecast table */}
          {result.forecast.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">{months}-Month Forecast</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Month</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Inflow</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Outflow</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Net</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.forecast.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{monthLabel(row.month)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 tabular-nums">₹{Number(row.inflow).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-red-600 tabular-nums">₹{Number(row.outflow).toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-semibold tabular-nums ${row.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {row.net >= 0 ? '+' : ''}₹{Number(row.net).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td className="px-4 py-2 text-xs font-semibold text-slate-500">Total</td>
                    <td className="px-4 py-2 text-right text-emerald-600 font-semibold text-xs tabular-nums">
                      ₹{result.forecast.reduce((s, r) => s + Number(r.inflow), 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600 font-semibold text-xs tabular-nums">
                      ₹{result.forecast.reduce((s, r) => s + Number(r.outflow), 0).toLocaleString()}
                    </td>
                    <td className={`px-4 py-2 text-right font-bold text-xs tabular-nums ${
                      result.forecast.reduce((s, r) => s + Number(r.net), 0) >= 0 ? 'text-emerald-700' : 'text-red-700'
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
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="text-3xl mb-3">📊</div>
          <p className="text-slate-500 text-sm">Click "Generate AI Forecast" to analyze your cash flow trends</p>
          <p className="text-slate-400 text-xs mt-1">Requires at least some posted journal entries</p>
        </div>
      )}
    </div>
  )
}
