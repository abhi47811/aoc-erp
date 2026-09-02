'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-red-500">
          <path d="M10 6v4m0 4h.01M18 10a8 8 0 11-16 0 8 8 0 0116 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-base font-semibold text-slate-900">Page error</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">{error.message || 'An unexpected error occurred on this page.'}</p>
        {error.digest && <p className="text-xs text-slate-500 mt-1 font-mono">ID: {error.digest}</p>}
      </div>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  )
}
