'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'

const EMPTY_FORM = { name: '', contact_person: '', email: '', mobile: '', gstin: '', address: '', notes: '' }

const MEDIA_TYPES: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'> = {
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/gif': 'image/gif',
  'image/webp': 'image/webp',
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function SuppliersPage() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState<'card' | 'gst' | null>(null)
  const [scanError, setScanError] = useState('')
  const cardInputRef = useRef<HTMLInputElement>(null)
  const gstInputRef = useRef<HTMLInputElement>(null)

  const { data: suppliers = [], isLoading, refetch } = trpc.supplier.list.useQuery()
  const createSupplier = trpc.supplier.create.useMutation({
    onSuccess: () => { setOpen(false); setForm(EMPTY_FORM); refetch() },
    onError: (e) => setError(e.message),
  })
  const deleteSupplier = trpc.supplier.delete.useMutation({ onSuccess: () => refetch() })
  const extractCard = trpc.supplier.extractCard.useMutation()
  const extractGst = trpc.supplier.extractGst.useMutation()

  async function handleCardScan(file: File) {
    setScanning('card')
    setScanError('')
    try {
      const mediaType = MEDIA_TYPES[file.type]
      if (!mediaType) throw new Error('Unsupported image type')
      const imageBase64 = await fileToBase64(file)
      const result = await extractCard.mutateAsync({ imageBase64, mediaType })
      setForm(f => ({
        ...f,
        name: result.company ?? f.name,
        contact_person: result.name ?? f.contact_person,
        email: result.email ?? f.email,
        mobile: result.mobile ?? f.mobile,
      }))
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Card scan failed')
    } finally {
      setScanning(null)
    }
  }

  async function handleGstScan(file: File) {
    setScanning('gst')
    setScanError('')
    try {
      const mediaType = MEDIA_TYPES[file.type]
      if (!mediaType) throw new Error('Unsupported image type')
      const imageBase64 = await fileToBase64(file)
      const result = await extractGst.mutateAsync({ imageBase64, mediaType })
      setForm(f => ({
        ...f,
        name: result.legal_name ?? f.name,
        gstin: result.gstin ?? f.gstin,
        address: result.address ?? f.address,
      }))
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'GST scan failed')
    } finally {
      setScanning(null)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    createSupplier.mutate({
      name: form.name,
      contact_person: form.contact_person || undefined,
      email: form.email || undefined,
      mobile: form.mobile || undefined,
      gstin: form.gstin || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
    })
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Suppliers</h1>
            <p className="text-sm text-slate-500 mt-0.5">{suppliers.length} supplier{suppliers.length === 1 ? '' : 's'}</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + New Supplier
          </button>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Name', 'Contact', 'Mobile', 'GSTIN', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-sm text-slate-400">No suppliers yet. Add your first supplier.</td>
                  </tr>
                ) : suppliers.map((s) => (
                  <tr key={s.id} onClick={() => router.push(`/suppliers/${s.id}`)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3.5 font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-3.5 text-slate-600">{s.contact_person ?? '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600">{s.mobile ?? '—'}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{s.gstin ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${s.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSupplier.mutate(s.id) }}
                        className="text-slate-400 hover:text-red-500 text-xs transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-elevation-lg animate-fade-in-up w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">New Supplier</h2>
              <div className="flex gap-3">
                <button type="button" onClick={() => cardInputRef.current?.click()} disabled={scanning !== null}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors">
                  {scanning === 'card' ? 'Scanning…' : '📇 Scan Card'}
                </button>
                <button type="button" onClick={() => gstInputRef.current?.click()} disabled={scanning !== null}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors">
                  {scanning === 'gst' ? 'Scanning…' : '🧾 Scan GST Cert'}
                </button>
              </div>
              <input ref={cardInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" capture="environment" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) void handleCardScan(f); e.target.value = '' }} />
              <input ref={gstInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" capture="environment" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) void handleGstScan(f); e.target.value = '' }} />
            </div>
            {scanError && <p className="text-red-600 text-sm">{scanError}</p>}
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <form onSubmit={submit} className="space-y-3">
              {[
                { label: 'Name *', key: 'name', required: true },
                { label: 'Contact Person', key: 'contact_person' },
                { label: 'Email', key: 'email' },
                { label: 'Mobile', key: 'mobile' },
                { label: 'GSTIN', key: 'gstin' },
                { label: 'Address', key: 'address' },
              ].map(({ label, key, required }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1">{label}</label>
                  <input
                    required={required}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={createSupplier.isPending}
                  className="flex-1 px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px text-sm rounded-lg disabled:opacity-50 transition-colors">
                  {createSupplier.isPending ? 'Saving…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
