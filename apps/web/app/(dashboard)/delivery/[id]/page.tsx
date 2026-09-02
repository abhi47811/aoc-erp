'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { NotFoundCard } from '@/components/ui/not-found-card'

// Offline-first: draft POD saved to localStorage until submission
const DRAFT_KEY = (id: string) => `pod_draft_${id}`

type PODDraft = {
  pod_notes: string
  gps_lat: string
  gps_lng: string
}

export default function DeliveryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [showCreate, setShowCreate] = useState(false)
  const [newDelivery, setNewDelivery] = useState({ number: '', driver_name: '', vehicle_number: '', scheduled_date: '' })
  const [pod, setPod] = useState<PODDraft>({ pod_notes: '', gps_lat: '', gps_lng: '' })
  const [podTarget, setPodTarget] = useState<string | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [offline, setOffline] = useState(false)

  const { data: wo, isError } = trpc.workOrder.get.useQuery(id)
  const { data: deliveries = [], refetch } = trpc.delivery.listForWO.useQuery(id)
  const createDelivery = trpc.delivery.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false) } })
  const updateStatus = trpc.delivery.updateStatus.useMutation({ onSuccess: () => refetch() })
  const recordPOD = trpc.delivery.recordPOD.useMutation({
    onSuccess: () => {
      refetch()
      setPodTarget(null)
      if (podTarget) localStorage.removeItem(DRAFT_KEY(podTarget))
    },
  })

  // Load draft from localStorage
  useEffect(() => {
    if (podTarget) {
      const saved = localStorage.getItem(DRAFT_KEY(podTarget))
      if (saved) {
        try { setPod(JSON.parse(saved)) } catch {}
      }
    }
  }, [podTarget])

  // Save draft on change
  useEffect(() => {
    if (podTarget) {
      localStorage.setItem(DRAFT_KEY(podTarget), JSON.stringify(pod))
    }
  }, [pod, podTarget])

  // Online/offline indicator
  useEffect(() => {
    setOffline(!navigator.onLine)
    const go = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', go)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', go); window.removeEventListener('offline', off) }
  }, [])

  function getGPS() {
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPod(p => ({ ...p, gps_lat: pos.coords.latitude.toFixed(7), gps_lng: pos.coords.longitude.toFixed(7) }))
        setGpsLoading(false)
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function submitPOD() {
    if (!podTarget) return
    recordPOD.mutate({
      id: podTarget,
      pod_notes: pod.pod_notes || undefined,
      gps_lat: pod.gps_lat ? parseFloat(pod.gps_lat) : undefined,
      gps_lng: pod.gps_lng ? parseFloat(pod.gps_lng) : undefined,
    })
  }

  const woData = wo as any
  const deliveriesData = deliveries as any[]

  if (isError) return <NotFoundCard entity="work order" backHref="/work-orders" />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Delivery</h1>
          {woData && (
            <p className="text-sm text-slate-500 mt-0.5">WO #{woData.number} · {woData.clients?.name ?? '—'}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {offline && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">Offline — drafts saved</span>
          )}
          <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">← Back</button>
        </div>
      </div>

      {/* Deliveries list */}
      {deliveriesData.length === 0 && !showCreate && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-6 text-center space-y-3">
          <p className="text-sm text-slate-500">No deliveries created yet.</p>
          <button onClick={() => setShowCreate(true)} className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Create Delivery
          </button>
        </div>
      )}

      {deliveriesData.map((d: any) => (
        <div key={d.id} className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900">{d.number}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {d.driver_name && <span>Driver: {d.driver_name}</span>}
                {d.vehicle_number && <span className="ml-2">· {d.vehicle_number}</span>}
                {d.scheduled_date && <span className="ml-2">· {d.scheduled_date}</span>}
              </div>
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
              d.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
              d.status === 'in_transit' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
              d.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-100' :
              d.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
              'bg-slate-100 text-slate-600'
            }`}>{d.status}</span>
          </div>

          {d.status === 'delivered' && d.pod_notes && (
            <div className="bg-slate-50 rounded p-2 text-xs text-slate-600">
              <span className="text-slate-500">POD Notes: </span>{d.pod_notes}
              {d.gps_lat && <span className="ml-2 text-slate-500">📍 {parseFloat(d.gps_lat).toFixed(4)},{parseFloat(d.gps_lng).toFixed(4)}</span>}
            </div>
          )}

          <div className="flex gap-2">
            {d.status === 'pending' && (
              <button
                onClick={() => updateStatus.mutate({ id: d.id, status: 'in_transit' })}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 text-xs font-medium px-3 py-1.5 rounded-md"
              >Start Transit</button>
            )}
            {d.status === 'in_transit' && (
              <button
                onClick={() => setPodTarget(d.id)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 text-xs font-medium px-3 py-1.5 rounded-md"
              >Record POD</button>
            )}
            {d.status === 'in_transit' && (
              <button
                onClick={() => updateStatus.mutate({ id: d.id, status: 'failed' })}
                className="text-red-600 hover:bg-red-50 border border-red-200 text-xs font-medium px-3 py-1.5 rounded-md"
              >Mark Failed</button>
            )}
          </div>

          {/* POD panel */}
          {podTarget === d.id && (
            <div className="border border-emerald-200 rounded-lg p-4 space-y-3 bg-emerald-50">
              <h3 className="text-sm font-semibold text-emerald-700">Proof of Delivery</h3>
              <textarea
                value={pod.pod_notes}
                onChange={e => setPod(p => ({ ...p, pod_notes: e.target.value }))}
                placeholder="Delivery notes, recipient name, remarks..."
                aria-label="Delivery notes"
                rows={3}
                className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-slate-500"
              />
              <div className="flex items-center gap-2">
                <input
                  value={pod.gps_lat}
                  readOnly
                  placeholder="Latitude"
                  aria-label="Latitude"
                  className="flex-1 bg-slate-50 text-slate-600 px-2 py-1.5 rounded text-xs border border-slate-200"
                />
                <input
                  value={pod.gps_lng}
                  readOnly
                  placeholder="Longitude"
                  aria-label="Longitude"
                  className="flex-1 bg-slate-50 text-slate-600 px-2 py-1.5 rounded text-xs border border-slate-200"
                />
                <button
                  onClick={getGPS}
                  disabled={gpsLoading}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded text-xs font-medium"
                >
                  {gpsLoading ? '…' : '📍 GPS'}
                </button>
              </div>
              {offline && (
                <p className="text-xs text-amber-600">You are offline. Draft auto-saved. Submit when back online.</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={submitPOD}
                  disabled={recordPOD.isPending || offline}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {recordPOD.isPending ? 'Saving…' : 'Submit POD'}
                </button>
                <button onClick={() => setPodTarget(null)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Create delivery form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">New Delivery</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input
                placeholder="Delivery Number *"
                aria-label="Delivery number"
                value={newDelivery.number}
                onChange={e => setNewDelivery(p => ({ ...p, number: e.target.value }))}
                className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
              />
            </div>
            <input
              placeholder="Driver Name"
              aria-label="Driver name"
              value={newDelivery.driver_name}
              onChange={e => setNewDelivery(p => ({ ...p, driver_name: e.target.value }))}
              className="bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
            />
            <input
              placeholder="Vehicle Number"
              aria-label="Vehicle number"
              value={newDelivery.vehicle_number}
              onChange={e => setNewDelivery(p => ({ ...p, vehicle_number: e.target.value }))}
              className="bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
            />
            <input
              type="date"
              aria-label="Scheduled date"
              value={newDelivery.scheduled_date}
              onChange={e => setNewDelivery(p => ({ ...p, scheduled_date: e.target.value }))}
              className="col-span-2 bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createDelivery.mutate({ wo_id: id, ...newDelivery, scheduled_date: newDelivery.scheduled_date || undefined, driver_name: newDelivery.driver_name || undefined, vehicle_number: newDelivery.vehicle_number || undefined })}
              disabled={!newDelivery.number || createDelivery.isPending}
              className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-150 ease-out-smooth hover:-translate-y-px px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {createDelivery.isPending ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium">Cancel</button>
          </div>
        </div>
      )}

      {deliveriesData.length > 0 && !showCreate && (
        <button onClick={() => setShowCreate(true)} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          + Add Another Delivery
        </button>
      )}
    </div>
  )
}
