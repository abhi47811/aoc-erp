import { createServerClient } from '@supabase/ssr'
import type { SetAllCookies } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@aoc/db'

export async function createTRPCContext() {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  return { supabase, user }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>
