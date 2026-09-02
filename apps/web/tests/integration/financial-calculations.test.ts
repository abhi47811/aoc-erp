import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestTenant, type TestTenant } from '../setup/testTenant'
import { getServiceClient } from '../setup/serviceClient'

import { invoiceRouter } from '@/server/trpc/routers/invoice'
import { inventoryRouter } from '@/server/trpc/routers/inventory'
import { bomRouter } from '@/server/trpc/routers/bom'
import { quotationRouter } from '@/server/trpc/routers/quotation'

// These exercise the money maths through the real routers and assert on what
// actually lands in Postgres. calcInvoiceTotals, calcItem and calcCost are all
// module-private, so the persisted row is the only honest place to check them —
// and it is the value the client is ultimately billed against anyway.

const uniq = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`

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

describe('financial calculations through the real tRPC path', () => {
  let tt: TestTenant

  beforeAll(async () => {
    tt = await createTestTenant('owner')
  })

  afterAll(async () => {
    if (!tt) return
    await purgeTenantData(tt.tenantId)
    await tt.cleanup()
  })

  describe('invoice GST — intra-state CGST + SGST split', () => {
    it('splits 18% as 9% CGST + 9% SGST and totals correctly', async () => {
      const caller = invoiceRouter.createCaller(tt.ctx)
      const created = await caller.create({
        number: 'client-supplied-value-is-ignored',
        invoice_date: '2026-03-15',
        items: [
          { description: '6mm clear toughened', qty: 10, unit_price: 450, cgst_pct: 9, sgst_pct: 9, igst_pct: 0 },
          { description: 'SS patch fitting', qty: 3, unit_price: 1250, cgst_pct: 9, sgst_pct: 9, igst_pct: 0 },
        ],
      })

      const { data } = await getServiceClient()
        .from('invoices')
        .select('subtotal, cgst_amount, sgst_amount, igst_amount, total')
        .eq('id', (created as { id: string }).id)
        .single()

      // 10 x 450 = 4500, 3 x 1250 = 3750 → subtotal 8250
      // 9% of 8250 = 742.50 each for CGST and SGST → total 9735.00
      expect(Number(data!.subtotal)).toBe(8250)
      expect(Number(data!.cgst_amount)).toBe(742.5)
      expect(Number(data!.sgst_amount)).toBe(742.5)
      expect(Number(data!.igst_amount)).toBe(0)
      expect(Number(data!.total)).toBe(9735)
    })

    it('rounds the total from unrounded tax, so it can differ from the printed components by a paisa', async () => {
      // FINDING, pinned deliberately. calcInvoiceTotals rounds each component
      // to 2dp independently AND rounds the total from the *unrounded* sum.
      // On this input those disagree by exactly one paisa: the printed
      // 2433.30 + 219.00 + 219.00 adds to 2871.30, but total is 2871.29.
      // Harmless at this scale, but it means a GST invoice PDF will not
      // always foot, so it is captured as known behaviour rather than left
      // to be rediscovered by a client reconciling a return.
      const caller = invoiceRouter.createCaller(tt.ctx)
      const created = await caller.create({
        number: 'x',
        invoice_date: '2026-03-16',
        items: [
          { description: 'Odd unit price', qty: 7, unit_price: 333.33, cgst_pct: 9, sgst_pct: 9, igst_pct: 0 },
          { description: 'Another', qty: 1, unit_price: 99.99, cgst_pct: 9, sgst_pct: 9, igst_pct: 0 },
        ],
      })

      const { data } = await getServiceClient()
        .from('invoices')
        .select('subtotal, cgst_amount, sgst_amount, igst_amount, total')
        .eq('id', (created as { id: string }).id)
        .single()

      // 7 x 333.33 = 2333.31, + 99.99 = 2433.30 subtotal
      // 9% of 2433.30 = 218.997 → stored as 219.00 for both CGST and SGST
      expect(Number(data!.subtotal)).toBe(2433.3)
      expect(Number(data!.cgst_amount)).toBe(219)
      expect(Number(data!.sgst_amount)).toBe(219)
      // 2433.30 + 218.997 + 218.997 = 2871.294 → 2871.29, not 2871.30
      expect(Number(data!.total)).toBe(2871.29)

      const printedSum =
        Number(data!.subtotal) +
        Number(data!.cgst_amount) +
        Number(data!.sgst_amount) +
        Number(data!.igst_amount)
      expect(printedSum - Number(data!.total)).toBeCloseTo(0.01, 6)
    })

    it('never drifts more than one paisa per rounded component', async () => {
      // The general guard: four independently-rounded components can each be
      // off by half a paisa, so 0.02 is the widest defensible window. Anything
      // beyond that is an arithmetic bug, not a rounding artefact.
      const caller = invoiceRouter.createCaller(tt.ctx)
      const created = await caller.create({
        number: 'x',
        invoice_date: '2026-03-16',
        items: [
          { description: 'Line A', qty: 13, unit_price: 1777.77, cgst_pct: 9, sgst_pct: 9, igst_pct: 0 },
          { description: 'Line B', qty: 6, unit_price: 41.66, cgst_pct: 9, sgst_pct: 9, igst_pct: 0 },
          { description: 'Line C', qty: 1, unit_price: 0.99, cgst_pct: 9, sgst_pct: 9, igst_pct: 0 },
        ],
      })

      const { data } = await getServiceClient()
        .from('invoices')
        .select('subtotal, cgst_amount, sgst_amount, igst_amount, total')
        .eq('id', (created as { id: string }).id)
        .single()

      const parts =
        Number(data!.subtotal) +
        Number(data!.cgst_amount) +
        Number(data!.sgst_amount) +
        Number(data!.igst_amount)

      expect(Math.abs(Number(data!.total) - parts)).toBeLessThanOrEqual(0.02)
      expect(Number(data!.total)).toBeGreaterThan(Number(data!.subtotal))
      // Sanity: 18% tax must land the total ~1.18x the subtotal.
      expect(Number(data!.total) / Number(data!.subtotal)).toBeCloseTo(1.18, 4)
    })
  })

  describe('invoice GST — inter-state IGST', () => {
    it('applies 18% IGST with zero CGST and SGST', async () => {
      const caller = invoiceRouter.createCaller(tt.ctx)
      const created = await caller.create({
        number: 'x',
        invoice_date: '2026-03-17',
        supply_state_code: 29,
        items: [
          { description: 'Interstate glazing supply', qty: 2, unit_price: 10000, cgst_pct: 0, sgst_pct: 0, igst_pct: 18 },
        ],
      })

      const { data } = await getServiceClient()
        .from('invoices')
        .select('subtotal, cgst_amount, sgst_amount, igst_amount, total')
        .eq('id', (created as { id: string }).id)
        .single()

      expect(Number(data!.subtotal)).toBe(20000)
      expect(Number(data!.cgst_amount)).toBe(0)
      expect(Number(data!.sgst_amount)).toBe(0)
      expect(Number(data!.igst_amount)).toBe(3600)
      expect(Number(data!.total)).toBe(23600)
    })

    it('charges nothing extra on a zero-rated line', async () => {
      const caller = invoiceRouter.createCaller(tt.ctx)
      const created = await caller.create({
        number: 'x',
        invoice_date: '2026-03-18',
        items: [
          { description: 'Exempt supply', qty: 5, unit_price: 200, cgst_pct: 0, sgst_pct: 0, igst_pct: 0 },
        ],
      })

      const { data } = await getServiceClient()
        .from('invoices')
        .select('subtotal, total')
        .eq('id', (created as { id: string }).id)
        .single()

      expect(Number(data!.subtotal)).toBe(1000)
      expect(Number(data!.total)).toBe(1000)
    })
  })

  describe('invoice numbering is server-controlled (GST Rule 46)', () => {
    it('ignores the client-supplied number and issues its own', async () => {
      const caller = invoiceRouter.createCaller(tt.ctx)
      const forged = `FORGED-${uniq()}`
      const created = await caller.create({
        number: forged,
        invoice_date: '2026-03-19',
        items: [{ description: 'x', qty: 1, unit_price: 100, cgst_pct: 9, sgst_pct: 9, igst_pct: 0 }],
      })

      expect((created as { number: string }).number).not.toBe(forged)
      expect((created as { number: string }).number).toBeTruthy()
    })

    it('issues distinct, non-repeating numbers across invoices', async () => {
      const caller = invoiceRouter.createCaller(tt.ctx)
      const numbers: string[] = []
      for (let i = 0; i < 3; i++) {
        const inv = await caller.create({
          number: 'x',
          invoice_date: '2026-03-20',
          items: [{ description: 'x', qty: 1, unit_price: 100, cgst_pct: 9, sgst_pct: 9, igst_pct: 0 }],
        })
        numbers.push((inv as { number: string }).number)
      }
      expect(new Set(numbers).size).toBe(3)
    })
  })

  describe('quotation line maths', () => {
    it('derives area_sqm from mm dimensions and totals the quote', async () => {
      const caller = quotationRouter.createCaller(tt.ctx)
      const created = await caller.create({
        number: `Q-${uniq()}`,
        items: [
          { description: '2440 x 1220 pane', qty: 4, width_mm: 2440, height_mm: 1220, unit_price: 2500 },
          { description: 'Hardware set', qty: 2, unit_price: 750 },
        ],
      })

      const { data: quote } = await getServiceClient()
        .from('quotations')
        .select('subtotal, total')
        .eq('id', (created as { id: string }).id)
        .single()

      // 4 x 2500 = 10000, 2 x 750 = 1500 → 11500
      expect(Number(quote!.subtotal)).toBe(11500)
      expect(Number(quote!.total)).toBe(11500)

      const { data: items } = await getServiceClient()
        .from('quotation_items')
        .select('description, area_sqm, amount')
        .eq('quotation_id', (created as { id: string }).id)
        .order('sort_order')

      // 4 x 2440mm x 1220mm = 11.9072 m²
      expect(Number(items![0]!.area_sqm)).toBeCloseTo(11.9072, 4)
      expect(Number(items![0]!.amount)).toBe(10000)
      // A line with no dimensions carries no area rather than a bogus zero.
      expect(items![1]!.area_sqm).toBeNull()
    })
  })

  describe('BOM material cost', () => {
    it('costs a BOM as sum(qty_per_sqm x area x unit_cost)', async () => {
      const inventory = inventoryRouter.createCaller(tt.ctx)
      const boms = bomRouter.createCaller(tt.ctx)

      const sealant = await inventory.create({
        code: `SEAL-${uniq()}`,
        name: 'Structural silicone',
        category: 'consumable',
        unit: 'tube',
        min_stock: 0,
        unit_cost: 500,
      })
      const gasket = await inventory.create({
        code: `GASK-${uniq()}`,
        name: 'EPDM gasket',
        category: 'consumable',
        unit: 'm',
        min_stock: 0,
        unit_cost: 120,
      })

      const bom = await boms.create({
        name: 'Curtain wall glazing BOM',
        items: [
          { item_id: (sealant as { id: string }).id, qty_per_sqm: 0.25 },
          { item_id: (gasket as { id: string }).id, qty_per_sqm: 2 },
        ],
      })

      const result = await boms.calcCost({ bom_id: (bom as { id: string }).id, area_sqm: 10 })

      // sealant: 0.25 x 10 x 500 = 1250 ; gasket: 2 x 10 x 120 = 2400
      expect(result.total).toBeCloseTo(3650, 6)
      expect(result.lines).toHaveLength(2)

      const sealantLine = result.lines.find((l: { name: string }) => l.name === 'Structural silicone')
      expect(sealantLine).toBeDefined()
      expect(Number(sealantLine!.qty)).toBeCloseTo(2.5, 6)
      expect(Number(sealantLine!.amount)).toBeCloseTo(1250, 6)

      // The total must equal the sum of the lines, not be computed separately.
      const lineSum = result.lines.reduce((s: number, l: { amount: number }) => s + Number(l.amount), 0)
      expect(result.total).toBeCloseTo(lineSum, 6)
    })

    it('scales linearly with area', async () => {
      const inventory = inventoryRouter.createCaller(tt.ctx)
      const boms = bomRouter.createCaller(tt.ctx)

      const item = await inventory.create({
        code: `LIN-${uniq()}`,
        name: 'Linear cost item',
        category: 'other',
        unit: 'pcs',
        min_stock: 0,
        unit_cost: 80,
      })
      const bom = await boms.create({
        name: 'Linear BOM',
        items: [{ item_id: (item as { id: string }).id, qty_per_sqm: 1.5 }],
      })
      const bomId = (bom as { id: string }).id

      const one = await boms.calcCost({ bom_id: bomId, area_sqm: 1 })
      const ten = await boms.calcCost({ bom_id: bomId, area_sqm: 10 })

      expect(one.total).toBeCloseTo(120, 6)
      expect(ten.total).toBeCloseTo(1200, 6)
      expect(ten.total).toBeCloseTo(one.total * 10, 6)
    })

    it('costs a BOM with no items at zero rather than NaN', async () => {
      const boms = bomRouter.createCaller(tt.ctx)
      const bom = await boms.create({ name: 'Empty BOM', items: [] })
      const result = await boms.calcCost({ bom_id: (bom as { id: string }).id, area_sqm: 5 })

      expect(result.lines).toEqual([])
      expect(result.total).toBe(0)
      expect(Number.isNaN(result.total)).toBe(false)
    })
  })
})
