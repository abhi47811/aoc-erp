import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestTenant, type TestTenant } from '../setup/testTenant'
import { getServiceClient } from '../setup/serviceClient'

import { purchaseRouter } from '@/server/trpc/routers/purchase'
import { inventoryRouter } from '@/server/trpc/routers/inventory'

// purchase.receive used to select current_stock, compute a new value in JS,
// then write it back -- a classic read-modify-write race. A receive batch
// with two lines against the same item_id (a real scenario: a PO line gets
// split into a partial delivery, or a user adds the same item twice) would
// read the same stale stock for both lines and the second write would
// clobber the first delta instead of adding to it. The fix moved the write
// to a single atomic `current_stock = current_stock + delta` RPC, with
// same-item deltas summed in JS first. This test proves both the normal
// path and the duplicate-item path land on the correct total.

const uniq = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`

async function purgeTenantData(tenantId: string) {
  const supabase = getServiceClient()
  const tables = ['stock_movements', 'purchase_order_items', 'purchase_orders', 'inventory_items'] as const
  for (const table of tables) {
    await supabase.from(table).delete().eq('tenant_id', tenantId)
  }
}

describe('purchase.receive', () => {
  let tt: TestTenant

  beforeAll(async () => {
    tt = await createTestTenant('owner')
  })

  afterAll(async () => {
    if (!tt) return
    await purgeTenantData(tt.tenantId)
    await tt.cleanup()
  })

  it('increments stock correctly for a normal single-line receive', async () => {
    const inv = inventoryRouter.createCaller(tt.ctx)
    const item = await inv.create({ code: `PR-${uniq()}`, name: 'Test Glass 4mm', unit_cost: 100 })

    const po = purchaseRouter.createCaller(tt.ctx)
    const order = await po.create({
      number: `PO-${uniq()}`,
      order_date: new Date().toISOString().slice(0, 10),
      items: [{ item_id: item.id, description: 'Glass 4mm', qty: 10, unit_price: 100 }],
    })
    const created = await po.get(order.id)
    const lineId = (created as any).purchase_order_items[0].id

    await po.receive({ id: order.id, received: [{ item_line_id: lineId, received_qty: 10 }] })

    const after = await inv.get(item.id)
    expect(Number((after as any).current_stock)).toBe(10)
  })

  it('sums deltas correctly when one batch receives two lines against the same item_id', async () => {
    const inv = inventoryRouter.createCaller(tt.ctx)
    const item = await inv.create({ code: `PR-${uniq()}`, name: 'Test Glass 6mm', unit_cost: 150 })

    const po = purchaseRouter.createCaller(tt.ctx)
    const order = await po.create({
      number: `PO-${uniq()}`,
      order_date: new Date().toISOString().slice(0, 10),
      items: [
        { item_id: item.id, description: 'Glass 6mm — batch 1', qty: 5, unit_price: 150 },
        { item_id: item.id, description: 'Glass 6mm — batch 2', qty: 7, unit_price: 150 },
      ],
    })
    const created = await po.get(order.id)
    const lines = (created as any).purchase_order_items as { id: string }[]
    expect(lines).toHaveLength(2)

    // Both lines received in the SAME receive() call — this is the race the
    // fix targets. A read-modify-write implementation would lose one delta.
    await po.receive({
      id: order.id,
      received: lines.map(l => ({ item_line_id: l.id, received_qty: l.id === lines[0]!.id ? 5 : 7 })),
    })

    const after = await inv.get(item.id)
    expect(Number((after as any).current_stock)).toBe(12)

    const movements = await getServiceClient()
      .from('stock_movements')
      .select('qty')
      .eq('item_id', item.id)
      .eq('reference_id', order.id)
    expect(movements.data).toHaveLength(1)
    expect(Number(movements.data![0]!.qty)).toBe(12)
  })

  it('marks the PO received once every line is fully received', async () => {
    const inv = inventoryRouter.createCaller(tt.ctx)
    const item = await inv.create({ code: `PR-${uniq()}`, name: 'Test Hardware', unit_cost: 20 })

    const po = purchaseRouter.createCaller(tt.ctx)
    const order = await po.create({
      number: `PO-${uniq()}`,
      order_date: new Date().toISOString().slice(0, 10),
      items: [{ item_id: item.id, description: 'Hinges', qty: 4, unit_price: 20 }],
    })
    const created = await po.get(order.id)
    const lineId = (created as any).purchase_order_items[0].id

    await po.receive({ id: order.id, received: [{ item_line_id: lineId, received_qty: 4 }] })

    const after = await po.get(order.id)
    expect((after as any).status).toBe('received')
  })
})
