export type Tone = 'success' | 'danger' | 'warning' | 'info' | 'violet' | 'neutral' | 'indigo' | 'orange' | 'yellow' | 'teal' | 'sky'

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  danger: 'bg-red-50 text-red-700 border border-red-100',
  warning: 'bg-amber-50 text-amber-700 border border-amber-100',
  info: 'bg-blue-50 text-blue-700 border border-blue-100',
  violet: 'bg-violet-50 text-violet-700 border border-violet-100',
  neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
  indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
  orange: 'bg-orange-50 text-orange-700 border border-orange-100',
  yellow: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
  teal: 'bg-teal-50 text-teal-700 border border-teal-100',
  sky: 'bg-sky-50 text-sky-700 border border-sky-100',
}

type BadgeProps = {
  tone?: Tone
  children: React.ReactNode
  className?: string
}

/**
 * Shared status-badge shell. The five-color status pattern (success/danger/
 * warning/info/neutral) was hand-rolled as a raw className string on the
 * same "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
 * shell in 40+ places across the app -- this is the single source of truth
 * for that shell going forward. Each page keeps its own status->tone
 * mapping (that's business logic, e.g. "won" -> success for leads but
 * "delivered" -> success for deliveries), just no longer hand-rolls colors.
 */
export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}>
      {children}
    </span>
  )
}
