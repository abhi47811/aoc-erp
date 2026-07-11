'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600 border border-slate-200',
  processing: 'bg-blue-50 text-blue-700 border border-blue-100',
  done: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  failed: 'bg-red-50 text-red-700 border border-red-100',
}

export default function DrawingsPage() {
  const { data: drawings = [], isLoading } = trpc.drawing.listAll.useQuery()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Drawings</h1>
        <p className="text-sm text-slate-500 mt-0.5">{drawings.length} drawing{drawings.length !== 1 ? 's' : ''} across all projects</p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
          ))}
        </div>
      ) : drawings.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-sm text-slate-400">
          No drawings yet. Upload one from a project's page to get AI-extracted glass measurements.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Title', 'Project', 'AI Status', 'Type', 'Uploaded'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drawings.map((d: any) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{d.title}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {d.projects ? (
                      <Link href={`/projects/${d.project_id}`} className="text-blue-600 hover:text-blue-700">
                        {d.projects.code} · {d.projects.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${STATUS_COLORS[d.ai_status ?? 'pending'] ?? STATUS_COLORS.pending}`}>
                      {d.ai_status ?? 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{d.mime_type ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
