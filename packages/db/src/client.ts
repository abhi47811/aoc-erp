import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return url
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return key
}

function getServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return key
}

// Browser / anon client (respects RLS)
export function createBrowserClient() {
  return createClient<Database>(getSupabaseUrl(), getAnonKey())
}

// Server admin client (bypasses RLS — use carefully)
export function createAdminClient() {
  return createClient<Database>(getSupabaseUrl(), getServiceKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
