'use client'

import { trpc } from '@/lib/trpc'

// Fields that are internal bookkeeping, not meaningful to a user reading
// what changed on a record.
const NOISY_FIELDS = new Set(['id', 'tenant_id', 'created_at', 'updated_at', 'created_by'])

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '(empty)'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function diffFields(oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null) {
  if (!oldData || !newData) return []
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)])
  const changes: { field: string; from: unknown; to: unknown }[] = []
  for (const key of keys) {
    if (NOISY_FIELDS.has(key)) continue
    const a = oldData[key]
    const b = newData[key]
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes.push({ field: key, from: a, to: b })
    }
  }
  return changes
}

export function ActivityTimeline({ tableName, recordId }: { tableName: string; recordId: string }) {
  const { data: events, isLoading } = trpc.activity.list.useQuery({ table_name: tableName, record_id: recordId })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
      </div>
    )
  }

  if (!events || events.length === 0) {
    return <p className="text-xs text-slate-400">No activity recorded yet.</p>
  }

  return (
    <ul className="space-y-3">
      {events.map(ev => {
        const changes = ev.action === 'UPDATE'
          ? diffFields(ev.old_data as Record<string, unknown> | null, ev.new_data as Record<string, unknown> | null)
          : []
        return (
          <li key={ev.id} className="text-sm border-l-2 border-slate-200 pl-3">
            <p className="text-slate-700">
              <span className="font-medium">{ev.user_name}</span>{' '}
              {ev.action === 'INSERT' && 'created this record'}
              {ev.action === 'DELETE' && 'deleted this record'}
              {ev.action === 'UPDATE' && (changes.length > 0 ? 'updated' : 'saved with no field changes')}
              <span className="text-slate-400"> · {timeAgo(ev.created_at)}</span>
            </p>
            {changes.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {changes.map(c => (
                  <li key={c.field} className="text-xs text-slate-500">
                    <span className="font-medium text-slate-600">{c.field}</span>:{' '}
                    <span className="line-through text-slate-400">{fmtValue(c.from)}</span>{' → '}
                    <span className="text-slate-700">{fmtValue(c.to)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}
