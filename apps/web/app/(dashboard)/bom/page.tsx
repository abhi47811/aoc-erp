'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'

export default function BOMPage() {
  const { data: boms = [], isLoading, refetch } = trpc.bom.list.useQuery()
  const deleteBom = trpc.bom.delete.useMutation({ onSuccess: () => { refetch(); setDeleteTarget(null) } })
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bill of Materials</h1>
          <p className="text-sm text-slate-500 mt-0.5">Material consumption templates per sqm of glass</p>
        </div>
        <Link href="/bom/new" className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + New BOM
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4 space-y-3">
              <div className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${70 - i * 8}%` }} />
              <div className="h-3 bg-slate-100 animate-pulse rounded" style={{ width: `${50 - i * 8}%` }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(boms as any[]).length === 0 ? (
            <div className="col-span-3 text-center py-10 text-sm text-slate-400">No BOM templates yet</div>
          ) : (boms as any[]).map((bom: any) => (
            <div key={bom.id} className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{bom.name}</h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {bom.glass_type && <span>{bom.glass_type} </span>}
                    {bom.thickness_mm && <span>· {bom.thickness_mm}mm</span>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Link href={`/bom/${bom.id}`} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Edit</Link>
                  <button
                    onClick={() => setDeleteTarget({ id: bom.id, label: bom.name })}
                    className="text-slate-400 hover:text-red-500 text-xs"
                  >Delete</button>
                </div>
              </div>

              {bom.bom_items?.length > 0 && (
                <div className="rounded-lg border border-slate-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left px-2 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Material</th>
                        <th className="text-right px-2 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Qty/sqm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bom.bom_items.map((bi: any) => (
                        <tr key={bi.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-2 py-1.5 text-slate-800">{bi.inventory_items?.name ?? '—'}</td>
                          <td className="px-2 py-1.5 text-right text-slate-400">{bi.qty_per_sqm} {bi.inventory_items?.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bom.notes && <p className="text-xs text-slate-400">{bom.notes}</p>}
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this BOM template?"
        description={`${deleteTarget?.label} will be permanently removed. This can't be undone.`}
        pending={deleteBom.isPending}
        onConfirm={() => deleteTarget && deleteBom.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
