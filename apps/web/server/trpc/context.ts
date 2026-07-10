import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import type { UserRole } from '@/lib/rbac'

function parseJwtClaims(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]
    if (!payload) return {}
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch {
    return {}
  }
}

export async function createTRPCContext({ req }: FetchCreateContextFnOptions) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Read custom JWT claims injected by the Postgres auth hook
  let tenantId: string | null = null
  let userRole: UserRole | null = null

  if (user) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      const claims = parseJwtClaims(session.access_token)
      tenantId = (claims.tenant_id as string) ?? null
      userRole = (claims.user_role as UserRole) ?? null
    }
  }

  return { req, supabase, user, tenantId, userRole }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>
