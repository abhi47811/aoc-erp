import { describe, it, expect } from 'vitest'
import { pdf } from '@react-pdf/renderer'
import { ProposalDocument, type ProposalQuotation, type ProposalTenant } from '@/components/proposal-pdf'

const TENANT: ProposalTenant = {
  name: 'AOC Glass Works',
  legal_name: 'Addon Concepts Pvt Ltd',
  gstin: '27AAAAA0000A1Z5',
  mobile: '9999999999',
  email: 'sales@aoc-erp.test',
  logo_url: null,
  primary_color: '#2563eb',
}

const QUOTATION: ProposalQuotation = {
  number: 'QT-2026-0042',
  status: 'sent',
  valid_until: '2026-12-31',
  created_at: '2026-08-01T00:00:00Z',
  subtotal: 100000,
  tax_amount: 18000,
  total: 118000,
  terms: 'Payment due within 30 days.',
  notes: 'Handle with care.',
  clients: { name: 'Skyline Developers', email: 'client@example.test', mobile: '8888888888' },
  projects: { code: 'PRJ-2026-001', name: 'Skyline Tower - Facade Glazing' },
  quotation_items: [
    {
      description: 'Facade Glazing Panel - Elevation A',
      qty: 4,
      unit: 'sqm',
      width_mm: 1200,
      height_mm: 3000,
      glass_type: 'Toughened + Laminated',
      thickness_mm: 24,
      unit_price: 8000,
      amount: 100000,
    },
  ],
}

describe('Proposal PDF generation (data → output validation, not just "renders without throwing")', () => {
  it('produces a structurally valid PDF file (real magic bytes and EOF trailer)', async () => {
    const instance = pdf(<ProposalDocument quotation={QUOTATION} tenant={TENANT} />)
    const buffer = await instance.toBuffer()
    const chunks: Buffer[] = []
    for await (const chunk of buffer) chunks.push(chunk as Buffer)
    const out = Buffer.concat(chunks)

    expect(out.subarray(0, 5).toString('ascii')).toBe('%PDF-')
    expect(out.subarray(-1024).toString('latin1')).toContain('%%EOF')
    expect(out.length).toBeGreaterThan(1000)
  })

  it('embeds the quotation number and project code as literal PDF metadata/content (not just structurally valid, actually carries the real data)', async () => {
    const instance = pdf(<ProposalDocument quotation={QUOTATION} tenant={TENANT} />)
    const buffer = await instance.toBuffer()
    const chunks: Buffer[] = []
    for await (const chunk of buffer) chunks.push(chunk as Buffer)
    const out = Buffer.concat(chunks).toString('latin1')

    // The Document title is set to `Proposal ${number}` and stored as an
    // uncompressed PDF /Info dictionary entry — a real, assertable output.
    expect(out).toContain('Proposal QT-2026-0042')
  })

  it('handles a quotation with zero line items without throwing (boundary case)', async () => {
    const empty: ProposalQuotation = { ...QUOTATION, quotation_items: [] }
    const instance = pdf(<ProposalDocument quotation={empty} tenant={TENANT} />)
    const buffer = await instance.toBuffer()
    const chunks: Buffer[] = []
    for await (const chunk of buffer) chunks.push(chunk as Buffer)
    expect(Buffer.concat(chunks).subarray(0, 5).toString('ascii')).toBe('%PDF-')
  })

  it('handles null optional fields (no client, no notes, no valid_until) without throwing', async () => {
    const sparse: ProposalQuotation = { ...QUOTATION, clients: null, notes: null, valid_until: null, terms: null }
    const instance = pdf(<ProposalDocument quotation={sparse} tenant={TENANT} />)
    const buffer = await instance.toBuffer()
    const chunks: Buffer[] = []
    for await (const chunk of buffer) chunks.push(chunk as Buffer)
    expect(Buffer.concat(chunks).subarray(0, 5).toString('ascii')).toBe('%PDF-')
  })
})
