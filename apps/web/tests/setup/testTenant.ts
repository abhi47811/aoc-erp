import { randomUUID } from 'node:crypto'
import { getServiceClient } from './serviceClient'
import type { Context } from '@/server/trpc/context'
import type { UserRole } from '@/lib/rbac'

// Ephemeral tenant + user for one test file, isolated from real tenant data
// and from every other test file. `public.users.id` has a real FK to
// auth.users.id, so we create (and later delete) a genuine, disposable
// Supabase Auth user via the admin API rather than a synthetic uuid.
export interface TestTenant {
  ctx: Context
  tenantId: string
  userId: string
  cleanup: () => Promise<void>
}

export async function createTestTenant(role: UserRole = 'owner'): Promise<TestTenant> {
  const supabase = getServiceClient()
  const tag = `e2e-${Date.now()}-${randomUUID().slice(0, 8)}`
  const tenantId = randomUUID()

  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: `${tag}-user@e2e.invalid`,
    email_confirm: true,
    password: randomUUID(),
  })
  if (authErr || !authUser.user) throw new Error(`Failed to create ephemeral auth user: ${authErr?.message}`)
  const userId = authUser.user.id

  const { error: tenantErr } = await supabase.from('tenants').insert({
    id: tenantId,
    name: `Test Tenant ${tag}`,
    legal_name: `Test Tenant ${tag} Pvt Ltd`,
    mobile: '9999999999',
    email: `${tag}@e2e.invalid`,
  })
  if (tenantErr) throw new Error(`Failed to create test tenant: ${tenantErr.message}`)

  const { error: userErr } = await supabase.from('users').insert({
    id: userId,
    tenant_id: tenantId,
    name: `E2E Test User`,
    email: `${tag}-user@e2e.invalid`,
    role,
  })
  if (userErr) throw new Error(`Failed to create test user: ${userErr.message}`)

  const { error: tuErr } = await supabase.from('tenant_users').insert({
    tenant_id: tenantId,
    user_id: userId,
    role,
  })
  if (tuErr) throw new Error(`Failed to create tenant_users link: ${tuErr.message}`)

  const ctx = {
    req: undefined,
    supabase,
    user: { id: userId, email: `${tag}-user@e2e.invalid` },
    tenantId,
    userRole: role,
  } as unknown as Context

  async function cleanupStorage() {
    // Storage objects have no FK to tenants — deleting the DB rows above
    // does not remove the underlying files, so without this every test run
    // would leave real blobs in the shared 'drawings' bucket forever.
    const { data: topLevel } = await supabase.storage.from('drawings').list(tenantId, { limit: 1000 })
    const paths: string[] = []
    for (const entry of topLevel ?? []) {
      if (entry.id === null) {
        // subfolder (e.g. supplier-docs/)
        const { data: sub } = await supabase.storage.from('drawings').list(`${tenantId}/${entry.name}`, { limit: 1000 })
        for (const s of sub ?? []) paths.push(`${tenantId}/${entry.name}/${s.name}`)
      } else {
        paths.push(`${tenantId}/${entry.name}`)
      }
    }
    if (paths.length) await supabase.storage.from('drawings').remove(paths)
  }

  async function cleanup() {
    await cleanupStorage()

    // Children first (no cascade assumed) — best-effort, log but don't throw
    // so one failed cleanup doesn't hide the next test's failure.
    const tables = [
      ['drawings', 'tenant_id'],
      ['suppliers', 'tenant_id'],
      ['purchase_order_items', 'tenant_id'],
      ['purchase_orders', 'tenant_id'],
      ['projects', 'tenant_id'],
      ['tenant_users', 'tenant_id'],
      ['users', 'tenant_id'],
      ['tenants', 'id'],
    ] as const

    for (const [table, column] of tables) {
      await supabase.from(table).delete().eq(column, tenantId)
    }

    await supabase.auth.admin.deleteUser(userId)
  }

  return { ctx, tenantId, userId, cleanup }
}

export async function createTestProject(ctx: Context, tenantId: string) {
  const supabase = getServiceClient()
  const { data, error } = await supabase.from('projects').insert({
    tenant_id: tenantId,
    code: `E2E-${Date.now()}`,
    name: 'E2E Test Project',
    status: 'active',
    created_by: (ctx.user as { id: string }).id,
  }).select().single()
  if (error) throw new Error(`Failed to create test project: ${error.message}`)
  return data as { id: string }
}
