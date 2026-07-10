'use client'

import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'

export default function PortalPage() {
  const { token } = useParams<{ token: string }>()
  const { data, isLoading, error } = trpc.share.getByToken.useQuery(token)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <p className="text-zinc-300 font-medium">Link not found or expired</p>
          <p className="text-zinc-500 text-sm mt-1">Please contact your project manager for a new link.</p>
        </div>
      </div>
    )
  }

  const { project, drawings } = data

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <p className="font-mono text-xs text-zinc-500 mb-1">{project.code}</p>
        <h1 className="text-2xl font-semibold text-zinc-100">{project.name}</h1>
        {project.site_address && (
          <p className="text-zinc-400 text-sm mt-1">{project.site_address}</p>
        )}
      </div>

      <div>
        <h2 className="text-base font-medium text-zinc-300 mb-3">Drawings</h2>
        {drawings.length === 0 ? (
          <p className="text-zinc-500 text-sm">No drawings available.</p>
        ) : (
          <div className="space-y-3">
            {drawings.map((d: any) => (
              <div
                key={d.id as string}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-zinc-100 font-medium truncate">{d.title as string}</p>
                  {d.mime_type && (
                    <p className="text-zinc-500 text-xs mt-0.5">{d.mime_type as string}</p>
                  )}
                </div>
                {d.view_url && (
                  <a
                    href={d.view_url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
                  >
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <p className="text-zinc-600 text-xs text-center">Powered by AOC ERP</p>
      </div>
    </div>
  )
}
