import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createTestTenant, type TestTenant } from '../setup/testTenant'
import { getServiceClient } from '../setup/serviceClient'
import { loadFixture, FIXTURES } from '../setup/fixtures'
import { randomUUID } from 'node:crypto'

const mockExtract = vi.fn()
vi.mock('@aoc/ai', () => ({
  extractSupplierDocItems: (...args: unknown[]) => mockExtract(...args),
}))

const BUCKET = 'drawings' // purchase docs share the drawings bucket, confirmed via code inspection

async function uploadFixture(tenantId: string, fixtureKey: keyof typeof FIXTURES) {
  const supabase = getServiceClient()
  const fx = FIXTURES[fixtureKey]
  const { buffer } = loadFixture(fx.file)
  const filePath = `${tenantId}/supplier-docs/${randomUUID()}-${fx.file}`
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, buffer, { contentType: fx.mime })
  return { filePath, error }
}

describe('Purchase supplier-document scan workflow', () => {
  let tt: TestTenant

  beforeAll(async () => {
    tt = await createTestTenant('owner')
  })

  afterAll(async () => {
    await tt.cleanup()
  })

  it('completes the full workflow for a real image: upload → extractFromDoc → structured items returned', async () => {
    const { purchaseRouter } = await import('@/server/trpc/routers/purchase')
    const caller = purchaseRouter.createCaller(tt.ctx)

    const { filePath, error } = await uploadFixture(tt.tenantId, 'jpeg')
    expect(error).toBeNull()

    mockExtract.mockResolvedValueOnce({ items: [{ description: 'Glass sheet 6mm', qty: 10, unit_price: 450 }], supplier_name: 'Test Glass Supplier' })

    const result = await caller.extractFromDoc({ file_path: filePath, mime_type: 'image/jpeg' })
    expect(result.items).toHaveLength(1)
    expect(result.supplier_name).toBe('Test Glass Supplier')
    expect(mockExtract).toHaveBeenCalledWith(expect.any(String), 'image/jpeg')
  })

  it('DEFECT FOUND AND FIXED IN THIS CHANGE: a PDF supplier doc now gracefully declines instead of forcing PDF bytes into an image content-block (the same bug class as the DWG extraction crash)', async () => {
    const { purchaseRouter } = await import('@/server/trpc/routers/purchase')
    const caller = purchaseRouter.createCaller(tt.ctx)

    const { filePath, error } = await uploadFixture(tt.tenantId, 'pdfDrawing')
    // The bucket itself allows PDFs (shared allowlist with drawings) — the
    // frontend's accept="image/*" is non-enforcing, so a PDF can genuinely
    // reach this endpoint via drag-and-drop or a permissive file picker.
    expect(error).toBeNull()

    mockExtract.mockClear()
    await expect(
      caller.extractFromDoc({ file_path: filePath, mime_type: 'application/pdf' })
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('only supports image files'),
    })
    expect(mockExtract).not.toHaveBeenCalled()
  })

  it('declines the same way for a DWG supplier doc', async () => {
    const { purchaseRouter } = await import('@/server/trpc/routers/purchase')
    const caller = purchaseRouter.createCaller(tt.ctx)

    const { filePath } = await uploadFixture(tt.tenantId, 'dwgDrawing')
    mockExtract.mockClear()
    await expect(
      caller.extractFromDoc({ file_path: filePath, mime_type: 'application/dwg' })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(mockExtract).not.toHaveBeenCalled()
  })

  it('still accepts every previously-working image format (no regression from the fix)', async () => {
    const { purchaseRouter } = await import('@/server/trpc/routers/purchase')
    const caller = purchaseRouter.createCaller(tt.ctx)

    for (const key of ['jpeg', 'png', 'gif', 'webp'] as const) {
      const { filePath } = await uploadFixture(tt.tenantId, key)
      mockExtract.mockResolvedValueOnce({ items: [], supplier_name: null })
      await expect(
        caller.extractFromDoc({ file_path: filePath, mime_type: FIXTURES[key].mime })
      ).resolves.toEqual({ items: [], supplier_name: null })
    }
  })

  it('rejects an unsupported real format at the Storage layer before the app ever sees it (SVG)', async () => {
    const { error } = await uploadFixture(tt.tenantId, 'svg')
    expect(error).not.toBeNull()
  })

  it('propagates a real download failure for a bogus file_path (INTERNAL_SERVER_ERROR, not a silent no-op)', async () => {
    const { purchaseRouter } = await import('@/server/trpc/routers/purchase')
    const caller = purchaseRouter.createCaller(tt.ctx)
    await expect(
      caller.extractFromDoc({ file_path: `${tt.tenantId}/supplier-docs/does-not-exist.jpg`, mime_type: 'image/jpeg' })
    ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' })
  })

  it('rate-limits after 10 calls within the window (isolated tenant)', async () => {
    const rl = await createTestTenant('owner')
    const { purchaseRouter } = await import('@/server/trpc/routers/purchase')
    const caller = purchaseRouter.createCaller(rl.ctx)
    mockExtract.mockResolvedValue({ items: [], supplier_name: null })

    try {
      for (let i = 0; i < 10; i++) {
        const { filePath } = await uploadFixture(rl.tenantId, 'jpeg')
        await caller.extractFromDoc({ file_path: filePath, mime_type: 'image/jpeg' })
      }
      const { filePath } = await uploadFixture(rl.tenantId, 'jpeg')
      await expect(
        caller.extractFromDoc({ file_path: filePath, mime_type: 'image/jpeg' })
      ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' })
    } finally {
      await rl.cleanup()
    }
  })
})
