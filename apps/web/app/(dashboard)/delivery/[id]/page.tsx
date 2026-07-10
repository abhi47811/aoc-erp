'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'

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
  const [offline, setOffline] = useState(!navigator.onLine)

  const { data: wo } = trpc.workOrder.get.useQuery(id)
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

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Delivery</h1>
          {woData && (
            <p className="text-sm text-zinc-400 mt-1">WO #{woData.number} · {woData.clients?.name ?? '—'}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {offline && (
            <span className="text-xs bg-amber-900 text-amber-300 px-2 py-1 rounded-full">Offline — drafts saved</span>
          )}
          <button onClick={() => router.back()} className="text-zinc-400 hover:text-zinc-200 text-sm">← Back</button>
        </div>
      </div>

      {/* Deliveries list */}
      {deliveriesData.length === 0 && !showCreate && (
        <div className="bg-zinc-800 rounded-lg p-6 text-center space-y-3">
          <p className="text-zinc-400 text-sm">No deliveries created yet.</p>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
            Create Delivery
          </button>
        </div>
      )}

      {deliveriesData.map((d: any) => (
        <div key={d.id} className="bg-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium text-zinc-100">{d.number}</div>
              <div className="text-xs text-zinc-400 mt-0.5">
                {d.driver_name && <span>Driver: {d.driver_name}</span>}
                {d.vehicle_number && <span className="ml-2">· {d.vehicle_number}</span>}
                {d.scheduled_date && <span className="ml-2">· {d.scheduled_date}</span>}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              d.status === 'delivered' ? 'bg-green-900 text-green-300' :
              d.status === 'in_transit' ? 'bg-blue-900 text-blue-300' :
              d.status === 'failed' ? 'bg-red-900 text-red-300' :
              'bg-zinc-700 text-zinc-300'
            }`}>{d.status}</span>
          </div>

          {d.status === 'delivered' && d.pod_notes && (
            <div className="bg-zinc-700/50 rounded p-2 text-xs text-zinc-300">
              <span className="text-zinc-500">POD Notes: </span>{d.pod_notes}
              {d.gps_lat && <span className="ml-2 text-zinc-500">📍 {parseFloat(d.gps_lat).toFixed(4)},{parseFloat(d.gps_lng).toFixed(4)}</span>}
            </div>
          )}

          <div className="flex gap-2">
            {d.status === 'pending' && (
              <button
                onClick={() => updateStatus.mutate({ id: d.id, status: 'in_transit' })}
                className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs px-3 py-1.5 rounded"
              >Start Transit</button>
            )}
            {d.status === 'in_transit' && (
              <button
                onClick={() => setPodTarget(d.id)}
                className="bg-green-600/20 hover:bg-green-600/40 text-green-300 text-xs px-3 py-1.5 rounded"
              >Record POD</button>
            )}
            {d.status === 'in_transit' && (
              <button
                onClick={() => updateStatus.mutate({ id: d.id, status: 'failed' })}
                className="bg-red-600/20 hover:bg-red-600/40 text-red-300 text-xs px-3 py-1.5 rounded"
              >Mark Failed</button>
            )}
          </div>

          {/* POD panel */}
          {podTarget === d.id && (
            <div className="border border-green-700 rounded-lg p-4 space-y-3 bg-green-900/10">
              <h3 className="text-sm font-medium text-green-300">Proof of Delivery</h3>
              <textarea
                value={pod.pod_notes}
                onChange={e => setPod(p => ({ ...p, pod_notes: e.target.value }))}
                placeholder="Delivery notes, recipient name, remarks..."
                rows={3}
                className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:outline-none resize-none"
              />
              <div className="flex items-center gap-2">
                <input
                  value={pod.gps_lat}
                  readOnly
                  placeholder="Latitude"
                  className="flex-1 bg-zinc-700 text-zinc-300 px-2 py-1.5 rounded text-xs border border-zinc-600"
                />
                <input
                  value={pod.gps_lng}
                  readOnly
                  placeholder="Longitude"
                  className="flex-1 bg-zinc-700 text-zinc-300 px-2 py-1.5 rounded text-xs border border-zinc-600"
                />
                <button
                  onClick={getGPS}
                  disabled={gpsLoading}
                  className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-1.5 rounded text-xs"
                >
                  {gpsLoading ? '…' : '📍 GPS'}
                </button>
              </div>
              {offline && (
                <p className="text-xs text-amber-400">You are offline. Draft auto-saved. Submit when back online.</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={submitPOD}
                  disabled={recordPOD.isPending || offline}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {recordPOD.isPending ? 'Saving…' : 'Submit POD'}
                </button>
                <button onClick={() => setPodTarget(null)} className="bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Create delivery form */}
      {showCreate && (
        <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-zinc-300">New Delivery</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input
                placeholder="Delivery Number *"
                value={newDelivery.number}
                onChange={e => setNewDelivery(p => ({ ...p, number: e.target.value }))}
                className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:outline-none"
              />
            </div>
            <input
              placeholder="Driver Name"
              value={newDelivery.driver_name}
              onChange={e => setNewDelivery(p => ({ ...p, driver_name: e.target.value }))}
              className="bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:outline-none"
            />
            <input
              placeholder="Vehicle Number"
              value={newDelivery.vehicle_number}
              onChange={e => setNewDelivery(p => ({ ...p, vehicle_number: e.target.value }))}
              className="bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:outline-none"
            />
            <input
              type="date"
              value={newDelivery.scheduled_date}
              onChange={e => setNewDelivery(p => ({ ...p, scheduled_date: e.target.value }))}
              className="col-span-2 bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createDelivery.mutate({ wo_id: id, ...newDelivery, scheduled_date: newDelivery.scheduled_date || undefined, driver_name: newDelivery.driver_name || undefined, vehicle_number: newDelivery.vehicle_number || undefined })}
              disabled={!newDelivery.number || createDelivery.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {createDelivery.isPending ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {deliveriesData.length > 0 && !showCreate && (
        <button onClick={() => setShowCreate(true)} className="text-blue-400 hover:text-blue-300 text-sm">
          + Add Another Delivery
        </button>
      )}
    </div>
  )
}
