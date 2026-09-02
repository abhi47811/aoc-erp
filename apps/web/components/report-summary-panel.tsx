'use client'

import { Sparkles } from 'lucide-react'
import { trpc } from '@/lib/trpc'

type ReportType = 'sales' | 'production' | 'inventory' | 'financial'

export function ReportSummaryPanel({ reportType, from, to }: { reportType: ReportType; from?: string; to?: string }) {
  const summarize = trpc.reports.summarize.useMutation()

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-violet-600" />
          <h3 className="text-sm font-semibold text-slate-800">AI Summary</h3>
        </div>
        <button
          onClick={() => summarize.mutate({ reportType, from_date: from, to_date: to })}
          disabled={summarize.isPending}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          {summarize.isPending ? (
            <>
              <span className="animate-spin text-xs">⟳</span>
              Summarizing…
            </>
          ) : (
            'Summarize'
          )}
        </button>
      </div>

      {summarize.error && (
        <p className="text-red-600 text-sm mt-3">{summarize.error.message}</p>
      )}

      {summarize.data && (
        <p className="text-sm text-slate-700 mt-3 leading-relaxed whitespace-pre-line">
          {summarize.data.summary}
        </p>
      )}

      {!summarize.data && !summarize.error && !summarize.isPending && (
        <p className="text-xs text-slate-500 mt-3">Claude reads this report&apos;s data and drafts a plain-language summary, flagging anything unusual.</p>
      )}
    </div>
  )
}
