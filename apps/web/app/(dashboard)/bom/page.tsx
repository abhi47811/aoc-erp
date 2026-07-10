'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'

export default function BOMPage() {
  const { data: boms = [], isLoading, refetch } = trpc.bom.list.useQuery()
  const deleteBom = trpc.bom.delete.useMutation({ onSuccess: () => refetch() })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Bill of Materials</h1>
          <p className="text-sm text-zinc-400 mt-1">Material consumption templates per sqm of glass</p>
        </div>
        <Link href="/bom/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + New BOM
        </Link>
      </div>

      {isLoading ? (
        <div className="text-zinc-400 text-center py-12">Loading...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(boms as any[]).length === 0 ? (
            <div className="col-span-3 text-center py-12 text-zinc-500">No BOM templates yet</div>
          ) : (boms as any[]).map((bom: any) => (
            <div key={bom.id} className="bg-zinc-800 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-100">{bom.name}</h3>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {bom.glass_type && <span>{bom.glass_type} </span>}
                    {bom.thickness_mm && <span>· {bom.thickness_mm}mm</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/bom/${bom.id}`} className="text-blue-400 hover:text-blue-300 text-xs">Edit</Link>
                  <button
                    onClick={() => confirm('Delete BOM?') && deleteBom.mutate(bom.id)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >Delete</button>
                </div>
              </div>

              {bom.bom_items?.length > 0 && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-zinc-500">
                      <th className="text-left py-1">Material</th>
                      <th className="text-right py-1">Qty/sqm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bom.bom_items.map((bi: any) => (
                      <tr key={bi.id} className="border-t border-zinc-700/50">
                        <td className="py-1 text-zinc-300">{bi.inventory_items?.name ?? '—'}</td>
                        <td className="py-1 text-right text-zinc-400">{bi.qty_per_sqm} {bi.inventory_items?.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {bom.notes && <p className="text-xs text-zinc-500">{bom.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
