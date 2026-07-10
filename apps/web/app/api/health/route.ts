import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; error?: string }> = {}

  // DB check
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const t = Date.now()
    const { error } = await supabase.from('tenants').select('id').limit(1)
    checks.database = error
      ? { status: 'error', error: error.message }
      : { status: 'ok', latencyMs: Date.now() - t }
  } catch (e) {
    checks.database = { status: 'error', error: String(e) }
  }

  const allOk = Object.values(checks).every(c => c.status === 'ok')

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    version: process.env.npm_package_version ?? '0.1.0',
    uptime: process.uptime(),
    checks,
    totalLatencyMs: Date.now() - start,
  }, { status: allOk ? 200 : 503 })
}
