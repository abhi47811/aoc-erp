import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TRPCError } from '@trpc/server'
import { createTestTenant, type TestTenant } from '../setup/testTenant'
import { getServiceClient } from '../setup/serviceClient'
import type { Context } from '@/server/trpc/context'

import { quotationRouter } from '@/server/trpc/routers/quotation'
import { invoiceRouter } from '@/server/trpc/routers/invoice'
import { inventoryRouter } from '@/server/trpc/routers/inventory'
import { bomRouter } from '@/server/trpc/routers/bom'

// ─────────────────────────────────────────────────────────────────────────────
// What this file actually proves
//
// ctx.supabase here is the SERVICE-ROLE client, exactly as testTenant.ts
// builds it — which means Postgres RLS is bypassed. That is deliberate: it
// isolates the APPLICATION-level `.eq('tenant_id', ctx.tenantId)` filter and
// the authorizedProcedure permission gate, and proves each holds on its own
// without RLS underneath. Both layers are supposed to be independently
// sufficient; these tests fail the moment one of them silently stops being so.
// ─────────────────────────────────────────────────────────────────────────────

const uniq = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`

/** Rows these tests create that testTenant.cleanup() does not know about. */
async function purgeTenantData(tenantId: string) {
  const supabase = getServiceClient()
  const tables = [
    'quotation_items',
    'quotations',
    'invoice_items',
    'invoices',
    'bom_items',
    'bom_templates',
    'stock_movements',
    'inventory_items',
  ] as const
  for (const table of tables) {
    await supabase.from(table).delete().eq('tenant_id', tenantId)
  }
}

describe('tenant + role isolation across tRPC procedures', () => {
  let tenantA: TestTenant
  let tenantB: TestTenant
  let viewer: TestTenant
  let salesperson: TestTenant

  // Records that belong to tenant B, which tenant A must never reach.
  let bQuotationId: string
  let bInvoiceId: string
  let bItemId: string
  let bBomId: string

  beforeAll(async () => {
    ;[tenantA, tenantB, viewer, salesperson] = await Promise.all([
      createTestTenant('owner'),
      createTestTenant('owner'),
      createTestTenant('viewer'),
      createTestTenant('salesperson'),
    ])

    const bQuotations = quotationRouter.createCaller(tenantB.ctx)
    const bInvoices = invoiceRouter.createCaller(tenantB.ctx)
    const bInventory = inventoryRouter.createCaller(tenantB.ctx)
    const bBoms = bomRouter.createCaller(tenantB.ctx)

    const quote = await bQuotations.create({
      number: `Q-B-${uniq()}`,
      items: [{ description: 'Tenant B confidential 12mm toughened', qty: 3, unit_price: 8500 }],
    })
    bQuotationId = (quote as { id: string }).id

    const invoice = await bInvoices.create({
      number: 'ignored-server-generates-this',
      invoice_date: '2026-03-01',
      items: [{ description: 'Tenant B invoice line', qty: 2, unit_price: 5000, cgst_pct: 9, sgst_pct: 9, igst_pct: 0 }],
    })
    bInvoiceId = (invoice as { id: string }).id

    const item = await bInventory.create({
      code: `B-ITEM-${uniq()}`,
      name: 'Tenant B silicone sealant',
      category: 'consumable',
      unit: 'tube',
      min_stock: 0,
      unit_cost: 375,
    })
    bItemId = (item as { id: string }).id

    const bom = await bBoms.create({
      name: 'Tenant B glazing BOM',
      items: [{ item_id: bItemId, qty_per_sqm: 0.4 }],
    })
    bBomId = (bom as { id: string }).id
  })

  afterAll(async () => {
    for (const t of [tenantA, tenantB, viewer, salesperson]) {
      if (!t) continue
      await purgeTenantData(t.tenantId)
      await t.cleanup()
    }
  })

  describe('reads never cross the tenant boundary', () => {
    it('hides tenant B quotations from tenant A by id', async () => {
      const caller = quotationRouter.createCaller(tenantA.ctx)
      await expect(caller.get(bQuotationId)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })

    it('hides tenant B quotations from tenant A in list results', async () => {
      const caller = quotationRouter.createCaller(tenantA.ctx)
      const rows = await caller.list()
      expect(rows.map((r: { id: string }) => r.id)).not.toContain(bQuotationId)
    })

    it('hides tenant B invoices from tenant A', async () => {
      const caller = invoiceRouter.createCaller(tenantA.ctx)
      await expect(caller.get(bInvoiceId)).rejects.toMatchObject({ code: 'NOT_FOUND' })
      const rows = await caller.list()
      expect(rows.map((r: { id: string }) => r.id)).not.toContain(bInvoiceId)
    })

    it('hides tenant B inventory and its unit costs from tenant A', async () => {
      // Unit cost is commercially sensitive — it is a competitor's buy price.
      const caller = inventoryRouter.createCaller(tenantA.ctx)
      await expect(caller.get(bItemId)).rejects.toMatchObject({ code: 'NOT_FOUND' })
      const rows = await caller.list()
      expect(rows.map((r: { id: string }) => r.id)).not.toContain(bItemId)
    })

    it('hides tenant B BOM templates from tenant A', async () => {
      const caller = bomRouter.createCaller(tenantA.ctx)
      await expect(caller.get(bBomId)).rejects.toMatchObject({ code: 'NOT_FOUND' })
      const rows = await caller.list()
      expect(rows.map((r: { id: string }) => r.id)).not.toContain(bBomId)
    })

    it('rejects a cross-tenant bom_id in calcCost at the application layer', async () => {
      const caller = bomRouter.createCaller(tenantA.ctx)
      await expect(caller.calcCost({ bom_id: bBomId, area_sqm: 10 })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })
  })

  describe('writes never cross the tenant boundary', () => {
    it('does not let tenant A delete a tenant B quotation', async () => {
      // The router returns { id } unconditionally, so a missing tenant filter
      // would look like success. The only honest check is whether the row
      // survived — read it back with the service client afterwards.
      const caller = quotationRouter.createCaller(tenantA.ctx)
      await caller.delete(bQuotationId).catch(() => undefined)

      const { data } = await getServiceClient()
        .from('quotations')
        .select('id, tenant_id')
        .eq('id', bQuotationId)
        .maybeSingle()

      expect(data, 'tenant A deleted a quotation belonging to tenant B').not.toBeNull()
      expect(data?.tenant_id).toBe(tenantB.tenantId)
    })

    it('does not let tenant A change a tenant B quotation status', async () => {
      const caller = quotationRouter.createCaller(tenantA.ctx)
      await caller.updateStatus({ id: bQuotationId, status: 'rejected' }).catch(() => undefined)

      const { data } = await getServiceClient()
        .from('quotations')
        .select('status')
        .eq('id', bQuotationId)
        .single()

      expect(data?.status).not.toBe('rejected')
    })

    it('does not let tenant A mark a tenant B invoice as paid', async () => {
      // Marking another tenant's invoice paid would corrupt their receivables.
      const caller = invoiceRouter.createCaller(tenantA.ctx)
      await caller
        .updateStatus({ id: bInvoiceId, status: 'paid', paid_amount: '999999' })
        .catch(() => undefined)

      const { data } = await getServiceClient()
        .from('invoices')
        .select('status, paid_amount')
        .eq('id', bInvoiceId)
        .single()

      expect(data?.status).not.toBe('paid')
      expect(Number(data?.paid_amount ?? 0)).toBe(0)
    })

    it('does not let tenant A delete a tenant B inventory item', async () => {
      const caller = inventoryRouter.createCaller(tenantA.ctx)
      await caller.delete(bItemId).catch(() => undefined)

      const { data } = await getServiceClient()
        .from('inventory_items')
        .select('id, tenant_id')
        .eq('id', bItemId)
        .maybeSingle()

      expect(data, 'tenant A deleted an inventory item belonging to tenant B').not.toBeNull()
      expect(data?.tenant_id).toBe(tenantB.tenantId)
    })

    it('does not let tenant A delete a tenant B BOM template', async () => {
      const caller = bomRouter.createCaller(tenantA.ctx)
      await caller.delete(bBomId).catch(() => undefined)

      const { data } = await getServiceClient()
        .from('bom_templates')
        .select('id, tenant_id')
        .eq('id', bBomId)
        .maybeSingle()

      expect(data, 'tenant A deleted a BOM belonging to tenant B').not.toBeNull()
      expect(data?.tenant_id).toBe(tenantB.tenantId)
    })
  })

  describe('authorizedProcedure enforces the RBAC permission, not just auth', () => {
    it('lets a viewer read but not write quotations', async () => {
      const caller = quotationRouter.createCaller(viewer.ctx)

      // tenantProcedure read works — proves the failures below are about the
      // permission gate and not a broken context.
      await expect(caller.list()).resolves.toBeInstanceOf(Array)

      await expect(
        caller.create({ number: `Q-V-${uniq()}`, items: [{ description: 'x', qty: 1, unit_price: 1 }] })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('stops a viewer raising or deleting an invoice', async () => {
      const caller = invoiceRouter.createCaller(viewer.ctx)
      await expect(
        caller.create({
          number: 'x',
          invoice_date: '2026-03-01',
          items: [{ description: 'x', qty: 1, unit_price: 1, cgst_pct: 9, sgst_pct: 9, igst_pct: 0 }],
        })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
      await expect(caller.delete(bInvoiceId)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('stops a salesperson touching finance or inventory', async () => {
      // Separation of duties: a salesperson may quote, never invoice or
      // re-price stock.
      const invoices = invoiceRouter.createCaller(salesperson.ctx)
      const inventory = inventoryRouter.createCaller(salesperson.ctx)

      await expect(
        invoices.create({
          number: 'x',
          invoice_date: '2026-03-01',
          items: [{ description: 'x', qty: 1, unit_price: 1, cgst_pct: 9, sgst_pct: 9, igst_pct: 0 }],
        })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })

      await expect(
        inventory.create({
          code: `X-${uniq()}`,
          name: 'x',
          category: 'other',
          unit: 'pcs',
          min_stock: 0,
          unit_cost: 1,
        })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })

      // …but the quote path a salesperson is meant to use still works.
      await expect(
        quotationRouter
          .createCaller(salesperson.ctx)
          .create({ number: `Q-S-${uniq()}`, items: [{ description: 'x', qty: 1, unit_price: 1 }] })
      ).resolves.toBeTruthy()
    })

    it('stops a viewer editing production BOMs', async () => {
      const caller = bomRouter.createCaller(viewer.ctx)
      await expect(caller.create({ name: 'x', items: [] })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })

  describe('protectedProcedure and tenantProcedure reject incomplete sessions', () => {
    it('rejects a session with no tenant claim as FORBIDDEN', async () => {
      // Real shape of a signed-up-but-not-onboarded user: authenticated, but
      // the JWT auth hook has not yet injected a tenant_id claim.
      const noTenantCtx = { ...tenantA.ctx, tenantId: null } as unknown as Context
      const caller = quotationRouter.createCaller(noTenantCtx)

      await expect(caller.list()).rejects.toSatisfy(
        (e: unknown) => e instanceof TRPCError && e.code === 'FORBIDDEN'
      )
      await expect(caller.list()).rejects.toMatchObject({ message: 'Onboarding required' })
    })

    it('rejects an unauthenticated session as UNAUTHORIZED', async () => {
      const anonCtx = { ...tenantA.ctx, user: null } as unknown as Context
      const caller = quotationRouter.createCaller(anonCtx)
      await expect(caller.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('rejects an unauthenticated session before the tenant check runs', async () => {
      // Ordering matters: protectedProcedure must fire first, so a request
      // carrying a forged tenantId but no user is UNAUTHORIZED, not FORBIDDEN.
      const forgedCtx = {
        ...tenantA.ctx,
        user: null,
        tenantId: tenantB.tenantId,
      } as unknown as Context
      await expect(
        quotationRouter.createCaller(forgedCtx).list()
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  })
})
