'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'

export default function CommunicationsPage() {
  const { data: notifications, isLoading: nLoading } = trpc.notifications.list.useQuery({ limit: 20 })
  const { data: unread } = trpc.notifications.unreadCount.useQuery()
  const utils = trpc.useUtils()

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  })

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate()
      utils.notifications.unreadCount.invalidate()
    },
  })

  const notifList = (notifications ?? []) as any[]
  const unreadCount = (unread as any)?.count ?? 0

  const typeColors: Record<string, string> = {
    info: 'bg-blue-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Communications</h1>
          <p className="text-sm text-slate-500 mt-0.5">Notifications and messaging</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/communications/whatsapp"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            WhatsApp
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/communications/whatsapp"
          className="bg-white hover:bg-slate-50 rounded-xl border border-slate-200 p-4 transition-colors">
          <div className="text-base font-semibold text-emerald-700 mb-1">WhatsApp</div>
          <div className="text-xs text-slate-500">Send messages via WhatsApp Web, view message history</div>
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-4">
          <div className="text-base font-semibold text-blue-700 mb-1">Notifications</div>
          <div className="text-xs text-slate-500">{unreadCount} unread · system & workflow alerts</div>
        </div>
      </div>

      {/* Notification center */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Notification Center</h3>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">{unreadCount}</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={() => markAllRead.mutate()}
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
              Mark all read
            </button>
          )}
        </div>

        {nLoading && (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
            ))}
          </div>
        )}

        {!nLoading && notifList.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">No notifications</div>
        )}

        {notifList.length > 0 && (
          <div className="divide-y divide-slate-100">
            {notifList.map((n: any) => (
              <div key={n.id}
                className={`px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors ${!n.read_at ? 'bg-blue-50/40' : ''}`}
                onClick={() => !n.read_at && markRead.mutate(n.id)}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${typeColors[n.type] ?? 'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-800 font-medium">{n.title}</div>
                  {n.body && <div className="text-xs text-slate-500 mt-0.5">{n.body}</div>}
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                {!n.read_at && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-2" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
