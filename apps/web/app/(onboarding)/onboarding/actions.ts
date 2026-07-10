'use server'

import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@aoc/db'
import { cookies } from 'next/headers'
import { inngest } from '@aoc/inngest'
import { revalidatePath } from 'next/cache'

export interface OnboardingData {
  // Step 1: Company info
  name: string
  legal_name: string
  gstin?: string
  mobile: string
  email: string
  state_code?: number
  // Step 2: Branding
  primary_color?: string
  logo_url?: string
  // Step 3: Tax setup (prefixes only — GST rates are seeded by Inngest)
  invoice_prefix?: string
  quote_prefix?: string
  po_prefix?: string
  // Step 4: Initial team members
  team_invites?: { email: string; role: string }[]
}

export async function completeOnboarding(data: OnboardingData) {
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
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // 1. Create the tenant
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 30)

  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({
      name: data.name,
      legal_name: data.legal_name,
      gstin: data.gstin || null,
      mobile: data.mobile,
      email: data.email,
      state_code: data.state_code ?? null,
      primary_color: data.primary_color ?? '#2563EB',
      logo_url: data.logo_url ?? null,
      invoice_prefix: data.invoice_prefix ?? 'INV',
      quote_prefix: data.quote_prefix ?? 'QT',
      po_prefix: data.po_prefix ?? 'PO',
      so_prefix: 'SO',
      pi_prefix: 'PI',
      settings: {},
      status: 'trial',
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select()
    .single()

  if (tenantError || !tenant) {
    return { error: tenantError?.message ?? 'Failed to create tenant' }
  }

  // 2. Add current user as owner
  const { error: userError } = await admin
    .from('tenant_users')
    .insert({
      tenant_id: tenant.id,
      user_id: user.id,
      role: 'owner',
      is_active: true,
    })

  if (userError) {
    // Rollback tenant on failure
    await admin.from('tenants').delete().eq('id', tenant.id)
    return { error: userError.message }
  }

  // 3. Send provisioning event to Inngest (seeds GST rates + approval workflows)
  await inngest.send({
    name: 'aoc/tenant.provisioned',
    data: {
      tenantId: tenant.id,
      ownerUserId: user.id,
      teamInvites: data.team_invites ?? [],
    },
  })

  // 4. Force session refresh so JWT picks up the new tenant_id
  await supabase.auth.refreshSession()

  revalidatePath('/dashboard')
  return { tenantId: tenant.id }
}
