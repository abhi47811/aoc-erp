import { describe, it, expect } from 'vitest'
import { extractGlassMeasurements, extractBusinessCard, extractGSTCertificate } from '@aoc/ai'
import { loadFixture, FIXTURES } from '../setup/fixtures'

// LIVE extraction-accuracy suite — makes real Anthropic API calls with real
// fixture files and checks the model actually reads them correctly. This
// costs real tokens on every run, so it is NOT part of `pnpm test` — run it
// explicitly with `pnpm test:live` when you want to verify true extraction
// accuracy (e.g. after touching a prompt or switching models).
//
// Requires ANTHROPIC_API_KEY in apps/web/.env.local.
describe('Live extraction accuracy (real Anthropic API calls)', () => {
  it('reads the real 1978 Bill Gates / Microsoft business card correctly', async () => {
    const { base64 } = loadFixture(FIXTURES.businessCard.file)
    const result = await extractBusinessCard(base64, 'image/jpeg')

    expect(result.name?.toLowerCase()).toContain('gates')
    expect(result.company?.toLowerCase()).toContain('microsoft')
    expect(result.mobile).toBeTruthy()
  }, 60_000)

  it('reads the real Central University of Tamil Nadu GST certificate correctly', async () => {
    const { base64 } = loadFixture(FIXTURES.gstCertificate.file)
    const result = await extractGSTCertificate(base64, 'image/png')

    expect(result.gstin).toBe('33AABTC0738L1ZV')
    expect(result.legal_name?.toUpperCase()).toContain('CENTRAL UNIVERSITY OF TAMILNADU')
  }, 60_000)

  it('reads the real glass drawing correctly (matches the previously human-verified result)', async () => {
    const { base64 } = loadFixture(FIXTURES.glassDrawingPng.file)
    const result = await extractGlassMeasurements(base64, 'image/png')

    expect(result.items.length).toBeGreaterThan(0)
    const item = result.items[0]!
    expect(item.width_mm).toBe(1200)
    expect(item.height_mm).toBe(3000)
    expect(item.qty).toBe(4)
  }, 60_000)

  it('reads a real PDF drawing via the document content-block branch without erroring', async () => {
    const { base64 } = loadFixture(FIXTURES.pdfDrawing.file)
    // sample.pdf is a generic W3C test doc, not a glass drawing — this
    // verifies the document-block plumbing succeeds end-to-end (a real API
    // round trip returning valid structured JSON), not extraction accuracy
    // against a specific expected value.
    const result = await extractGlassMeasurements(base64, 'application/pdf')
    expect(result).toHaveProperty('items')
    expect(Array.isArray(result.items)).toBe(true)
  }, 60_000)
})
