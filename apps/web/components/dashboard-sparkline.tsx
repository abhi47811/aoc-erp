'use client'

import { ResponsiveContainer, LineChart, Line } from 'recharts'

export function DashboardSparkline({ trend, color }: { trend: number[]; color: string }) {
  return (
    <ResponsiveContainer width={56} height={28}>
      <LineChart data={trend.map(v => ({ v }))}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
