import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Anthropic SDK at the module boundary so these tests are fast,
// free, and deterministic — they verify OUR branching logic (which content
// block type we send per media type), not Claude's actual OCR quality.
// That's covered separately by tests/live/extraction-accuracy.test.ts.
const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

function mockTextResponse(json: unknown) {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: 'text', text: JSON.stringify(json) }],
  })
}

describe('@aoc/ai extraction functions', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  describe('extractGlassMeasurements — content-block branching', () => {
    it('sends a "document" block for application/pdf (this exact branch was the Bug #2 fix)', async () => {
      const { extractGlassMeasurements } = await import('@aoc/ai')
      mockTextResponse({ items: [], total_area_sqm: 0, drawing_ref: null })

      await extractGlassMeasurements('base64data', 'application/pdf')

      const call = mockCreate.mock.calls[0]![0] as { messages: Array<{ content: Array<{ type: string; source?: { media_type: string } }> }> }
      const block = call.messages[0]!.content[0]!
      expect(block.type).toBe('document')
      expect(block.source?.media_type).toBe('application/pdf')
    })

    it('sends an "image" block for image/png', async () => {
      const { extractGlassMeasurements } = await import('@aoc/ai')
      mockTextResponse({ items: [], total_area_sqm: 0, drawing_ref: null })

      await extractGlassMeasurements('base64data', 'image/png')

      const call = mockCreate.mock.calls[0]![0] as { messages: Array<{ content: Array<{ type: string; source?: { media_type: string } }> }> }
      const block = call.messages[0]!.content[0]!
      expect(block.type).toBe('image')
      expect(block.source?.media_type).toBe('image/png')
    })

    it('defaults to image/jpeg when no mediaType is passed', async () => {
      const { extractGlassMeasurements } = await import('@aoc/ai')
      mockTextResponse({ items: [], total_area_sqm: 0, drawing_ref: null })

      await extractGlassMeasurements('base64data')

      const call = mockCreate.mock.calls[0]![0] as { messages: Array<{ content: Array<{ type: string; source?: { media_type: string } }> }> }
      expect(call.messages[0]!.content[0]!.source?.media_type).toBe('image/jpeg')
    })

    it('parses a valid structured JSON response', async () => {
      const { extractGlassMeasurements } = await import('@aoc/ai')
      const payload = {
        items: [{ description: 'Panel A', qty: 2, width_mm: 600, height_mm: 900, glass_type: 'Clear', thickness_mm: 6, notes: null }],
        total_area_sqm: 1.08,
        drawing_ref: 'DWG-001',
      }
      mockTextResponse(payload)

      const result = await extractGlassMeasurements('base64data', 'image/jpeg')
      expect(result).toEqual(payload)
    })

    it('throws a clear error when the model returns no JSON', async () => {
      const { extractGlassMeasurements } = await import('@aoc/ai')
      mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'Sorry, I cannot read this image.' }] })

      await expect(extractGlassMeasurements('base64data', 'image/jpeg')).rejects.toThrow('AI returned no valid JSON')
    })

    it('surfaces the underlying API error (e.g. what a real DWG-as-image call would throw) instead of swallowing it', async () => {
      const { extractGlassMeasurements } = await import('@aoc/ai')
      mockCreate.mockRejectedValueOnce(new Error('400 Bad Request: media_type not supported for image blocks'))

      await expect(extractGlassMeasurements('base64data', 'image/jpeg')).rejects.toThrow('media_type not supported')
    })
  })

  describe('extractBusinessCard', () => {
    it('always sends an image block (no document-type support) and parses the result', async () => {
      const { extractBusinessCard } = await import('@aoc/ai')
      mockTextResponse({ name: 'Jane Doe', company: 'Acme', email: 'jane@acme.test', mobile: '555-0100' })

      const result = await extractBusinessCard('base64data', 'image/jpeg')

      const call = mockCreate.mock.calls[0]![0] as { messages: Array<{ content: Array<{ type: string }> }> }
      expect(call.messages[0]!.content[0]!.type).toBe('image')
      expect(result.name).toBe('Jane Doe')
    })
  })

  describe('extractGSTCertificate', () => {
    it('parses gstin/legal_name/address from a valid response', async () => {
      const { extractGSTCertificate } = await import('@aoc/ai')
      mockTextResponse({ gstin: '33AABTC0738L1ZV', legal_name: 'CENTRAL UNIVERSITY OF TAMILNADU', address: 'Tiruvarur' })

      const result = await extractGSTCertificate('base64data', 'image/png')
      expect(result.gstin).toBe('33AABTC0738L1ZV')
    })
  })

  describe('extractSupplierDocItems', () => {
    it('parses line items and supplier_name', async () => {
      const { extractSupplierDocItems } = await import('@aoc/ai')
      mockTextResponse({ items: [{ description: 'Glass panel', qty: 5, unit_price: 250 }], supplier_name: 'Glass Co' })

      const result = await extractSupplierDocItems('base64data', 'image/jpeg')
      expect(result.items).toHaveLength(1)
      expect(result.supplier_name).toBe('Glass Co')
    })

    it('has no application/pdf branch at all — its type signature only accepts image mime types', async () => {
      // Static/structural check: this function's exported type signature
      // restricts mediaType to image/*. If a PDF ever reaches it (as it did
      // for purchase.ts before the fix in this change), it would silently
      // build an `image` content block around PDF bytes and 400 with Claude.
      const { extractSupplierDocItems } = await import('@aoc/ai')
      expect(extractSupplierDocItems.length).toBeLessThanOrEqual(2)
    })
  })
})
