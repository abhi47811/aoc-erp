'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function NotFoundCard({ entity, backHref }: { entity: string; backHref: string }) {
  return (
    <div className="max-w-2xl space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={16} aria-hidden="true" />
        Back
      </Link>
      <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-8 text-center space-y-2">
        <p className="text-sm font-medium text-slate-900">This {entity} doesn&apos;t exist</p>
        <p className="text-xs text-slate-500">
          It may have been deleted, or the link is incorrect. Nothing was found for this ID.
        </p>
      </div>
    </div>
  )
}
