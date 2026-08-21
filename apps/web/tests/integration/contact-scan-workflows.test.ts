import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createTestTenant, type TestTenant } from '../setup/testTenant'
import { loadFixture, FIXTURES } from '../setup/fixtures'

const mockBusinessCard = vi.fn()
const mockGst = vi.fn()
vi.mock('@aoc/ai', () => ({
  extractBusinessCard: (...args: unknown[]) => mockBusinessCard(...args),
  extractGSTCertificate: (...args: unknown[]) => mockGst(...args),
}))

const MOCK_CARD_RESULT = { name: 'Jane Doe', company: 'Acme Glass Co', email: 'jane@acme.test', mobile: '555-0100' }
const MOCK_GST_RESULT = { gstin: '27AAAAA0000A1Z5', legal_name: 'Test Legal Name', address: 'Test Address' }

// All four entity types that offer business-card scan, and the two (supplier,
// client) that also offer GST-certificate scan — each is its own router with
// its own RBAC permission, so each needs its own coverage.
const CARD_ROUTERS = [
  { name: 'supplier', permission: 'MANAGE_INVENTORY' },
  { name: 'architect', permission: 'MANAGE_CLIENTS' },
  { name: 'lead', permission: 'MANAGE_LEADS' },
  { name: 'client', permission: 'MANAGE_CLIENTS' },
] as const
const GST_ROUTERS = ['supplier', 'client'] as const

describe('Business card + GST certificate scan workflows', () => {
  let tt: TestTenant
  let viewerTt: TestTenant

  beforeAll(async () => {
    tt = await createTestTenant('owner')
    viewerTt = await createTestTenant('viewer')
  })

  afterAll(async () => {
    await tt.cleanup()
    await viewerTt.cleanup()
  })

  for (const { name } of CARD_ROUTERS) {
    describe(`${name}.extractCard`, () => {
      it('scans a real business-card image and returns the structured result', async () => {
        const mod = await import(`@/server/trpc/routers/${name}`)
        const router = mod[`${name}Router`]
        const caller = router.createCaller(tt.ctx)

        const { base64 } = loadFixture(FIXTURES.businessCard.file)
        mockBusinessCard.mockResolvedValueOnce(MOCK_CARD_RESULT)

        const result = await caller.extractCard({ imageBase64: base64, mediaType: 'image/jpeg' })
        expect(result).toEqual(MOCK_CARD_RESULT)
        expect(mockBusinessCard).toHaveBeenCalledWith(base64, 'image/jpeg')
      })

      it('rejects a PDF mediaType at the zod boundary (business cards are photos, not documents — matches the extractor which has no document branch)', async () => {
        const mod = await import(`@/server/trpc/routers/${name}`)
        const router = mod[`${name}Router`]
        const caller = router.createCaller(tt.ctx)
        await expect(
          caller.extractCard({ imageBase64: 'anything', mediaType: 'application/pdf' as never })
        ).rejects.toThrow()
      })

      it('denies a viewer-role user (RBAC boundary)', async () => {
        const mod = await import(`@/server/trpc/routers/${name}`)
        const router = mod[`${name}Router`]
        const caller = router.createCaller(viewerTt.ctx)
        await expect(
          caller.extractCard({ imageBase64: 'x', mediaType: 'image/jpeg' })
        ).rejects.toMatchObject({ code: 'FORBIDDEN' })
      })

      it('propagates a model failure as INTERNAL_SERVER_ERROR instead of a fake empty success', async () => {
        const mod = await import(`@/server/trpc/routers/${name}`)
        const router = mod[`${name}Router`]
        const caller = router.createCaller(tt.ctx)
        mockBusinessCard.mockRejectedValueOnce(new Error('AI returned no valid JSON'))
        await expect(
          caller.extractCard({ imageBase64: 'x', mediaType: 'image/jpeg' })
        ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' })
      })
    })
  }

  for (const name of GST_ROUTERS) {
    describe(`${name}.extractGst`, () => {
      it('scans a real GST certificate image and returns the structured result', async () => {
        const mod = await import(`@/server/trpc/routers/${name}`)
        const router = mod[`${name}Router`]
        const caller = router.createCaller(tt.ctx)

        const { base64 } = loadFixture(FIXTURES.gstCertificate.file)
        mockGst.mockResolvedValueOnce(MOCK_GST_RESULT)

        const result = await caller.extractGst({ imageBase64: base64, mediaType: 'image/png' })
        expect(result).toEqual(MOCK_GST_RESULT)
      })

      it('denies a viewer-role user (RBAC boundary)', async () => {
        const mod = await import(`@/server/trpc/routers/${name}`)
        const router = mod[`${name}Router`]
        const caller = router.createCaller(viewerTt.ctx)
        await expect(
          caller.extractGst({ imageBase64: 'x', mediaType: 'image/png' })
        ).rejects.toMatchObject({ code: 'FORBIDDEN' })
      })
    })
  }
})
