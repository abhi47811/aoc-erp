import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

function parseJwtClaims(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]
    if (!payload) return {}
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch {
    return {}
  }
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isOnboarding = pathname.startsWith('/onboarding')
  // Every real app route lives inside the (dashboard) route group, which
  // Next strips from the URL -- so `pathname.startsWith('/dashboard')`
  // only ever matched the literal '/dashboard' URL itself, leaving every
  // other page (e.g. /leads, /drawings) unprotected. Instead of enumerating
  // every route (fragile -- a new page is unprotected by default until
  // someone remembers to list it), treat everything as protected except
  // the known-public paths: the login page and token-gated share links.
  const isPublicPath = pathname === '/login' || pathname.startsWith('/portal/')

  // Redirect unauthenticated users to login
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from login
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // For authenticated users on any protected page, check tenant presence
  if (user && !isPublicPath) {
    const { data: { session } } = await supabase.auth.getSession()
    const claims = session?.access_token ? parseJwtClaims(session.access_token) : {}
    let hasTenant = Boolean(claims.tenant_id)

    // JWT claims may be stale (e.g. user row inserted via SQL without re-login).
    // Fall back to a direct DB check so SQL-seeded users aren't stuck in onboarding.
    if (!hasTenant) {
      const { data } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      hasTenant = Boolean(data?.tenant_id)
    }

    // No tenant → send to onboarding
    if (!hasTenant && !isOnboarding) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Has tenant → skip onboarding
    if (hasTenant && isOnboarding) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block')
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  supabaseResponse.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' data: https://*.supabase.co wss://*.supabase.co https://graph.facebook.com; font-src 'self' data:;"
  )

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
