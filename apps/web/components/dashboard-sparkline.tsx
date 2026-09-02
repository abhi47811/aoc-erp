'use client'

import { ResponsiveContainer, LineChart, Line } from 'recharts'

export function DashboardSparkline({ trend, color, label, format = (n: number) => String(Math.round(n)) }: {
  trend: number[]
  color: string
  label: string
  format?: ((n: number) => string) | undefined
}) {
  const first = trend[0] ?? 0
  const last = trend[trend.length - 1] ?? first
  const change =
    last > first ? `increased from ${format(first)} to ${format(last)}`
    : last < first ? `decreased from ${format(first)} to ${format(last)}`
    : `stayed at ${format(last)}`

  return (
    <>
      <span className="sr-only">{label} trend over the last {trend.length} days: {change}</span>
      <div aria-hidden="true">
        <ResponsiveContainer width={56} height={28}>
          <LineChart data={trend.map(v => ({ v }))}>
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}
