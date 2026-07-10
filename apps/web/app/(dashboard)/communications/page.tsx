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
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Communications</h1>
          <p className="text-sm text-zinc-400 mt-1">Notifications and messaging</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/communications/whatsapp"
            className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            WhatsApp
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/communications/whatsapp"
          className="bg-zinc-800 hover:bg-zinc-700 rounded-lg p-4 transition-colors">
          <div className="text-base font-semibold text-green-400 mb-1">WhatsApp</div>
          <div className="text-xs text-zinc-400">Send messages via WhatsApp Web, view message history</div>
        </Link>
        <div className="bg-zinc-800 rounded-lg p-4">
          <div className="text-base font-semibold text-blue-400 mb-1">Notifications</div>
          <div className="text-xs text-zinc-400">{unreadCount} unread · system & workflow alerts</div>
        </div>
      </div>

      {/* Notification center */}
      <div className="bg-zinc-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-200">Notification Center</h3>
            {unreadCount > 0 && (
              <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={() => markAllRead.mutate()}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              Mark all read
            </button>
          )}
        </div>

        {nLoading && <div className="p-4 text-zinc-500 text-sm">Loading…</div>}

        {!nLoading && notifList.length === 0 && (
          <div className="p-8 text-center text-zinc-500 text-sm">No notifications</div>
        )}

        {notifList.length > 0 && (
          <div className="divide-y divide-zinc-700">
            {notifList.map((n: any) => (
              <div key={n.id}
                className={`px-4 py-3 flex items-start gap-3 hover:bg-zinc-700/30 transition-colors ${!n.read_at ? 'bg-zinc-700/10' : ''}`}
                onClick={() => !n.read_at && markRead.mutate(n.id)}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${typeColors[n.type] ?? 'bg-zinc-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-200">{n.title}</div>
                  {n.body && <div className="text-xs text-zinc-400 mt-0.5">{n.body}</div>}
                  <div className="text-xs text-zinc-600 mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                {!n.read_at && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-2" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
