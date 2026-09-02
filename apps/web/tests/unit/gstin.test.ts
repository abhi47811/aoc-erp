import { describe, it, expect } from 'vitest'
import { gstinSchema, hsnSchema, stateCodeSchema } from '@aoc/validators'

// Independently-published example GSTINs. These are the sample registration
// numbers used throughout Indian GST documentation and training material —
// they are not private data, and their check digits were fixed by the GSTN
// algorithm long before this codebase existed. Accepting them is therefore
// real corroboration that computeGstinChecksum matches the published spec,
// not a restatement of our own implementation.
const KNOWN_VALID = [
  '27AAPFU0939F1ZV',
  '29AAGCB7383J1Z4',
  '19AABCU9603R1ZK',
]

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

describe('gstinSchema — checksum is genuinely enforced', () => {
  it.each(KNOWN_VALID)('accepts the published GSTIN %s', gstin => {
    expect(gstinSchema.parse(gstin)).toBe(gstin)
  })

  it('accepts exactly one of the 36 possible check digits for a given prefix', () => {
    // This is the property that separates a real checksum from a stub. A
    // no-op or always-true refine would accept every candidate that clears
    // the format regex; a correct mod-36 checksum accepts precisely one.
    const prefix = '27AAPFU0939F1Z'
    const accepted = GSTIN_CHARS.split('').filter(
      c => gstinSchema.safeParse(prefix + c).success
    )
    expect(accepted).toEqual(['V'])
  })

  it('rejects every single-character mutation of a valid GSTIN', () => {
    // Walk each of the 14 payload positions and substitute every other legal
    // character. Because the 15th digit stays fixed, all 14 x 35 variants
    // must fail — either on format or on checksum.
    const valid = '27AAPFU0939F1ZV'
    let checked = 0
    for (let i = 0; i < 14; i++) {
      for (const c of GSTIN_CHARS) {
        if (c === valid[i]) continue
        const mutated = valid.slice(0, i) + c + valid.slice(i + 1)
        checked++
        expect(
          gstinSchema.safeParse(mutated).success,
          `mutation at index ${i} to "${c}" (${mutated}) was accepted`
        ).toBe(false)
      }
    }
    expect(checked).toBe(14 * 35)
  })

  it('rejects a transposition of two differently-weighted characters', () => {
    // Positions alternate weight 1/2, so swapping adjacent characters changes
    // the weighted sum. An order-insensitive checksum would miss this.
    const valid = '27AAPFU0939F1ZV'
    const transposed = valid.slice(0, 8) + valid[9] + valid[8] + valid.slice(10)
    expect(transposed).not.toBe(valid)
    expect(gstinSchema.safeParse(transposed).success).toBe(false)
  })
})

describe('gstinSchema — format rules', () => {
  it('rejects a GSTIN that is not exactly 15 characters', () => {
    expect(gstinSchema.safeParse('27AAPFU0939F1Z').success).toBe(false)
    expect(gstinSchema.safeParse('27AAPFU0939F1ZVV').success).toBe(false)
    expect(gstinSchema.safeParse('').success).toBe(false)
  })

  it('rejects a state code outside the 00–39 range the regex allows', () => {
    // The leading pair is a state code; the regex constrains the first digit
    // to 0–3, so a 4x or 9x prefix must not pass.
    expect(gstinSchema.safeParse('47AAPFU0939F1ZV').success).toBe(false)
    expect(gstinSchema.safeParse('97AAPFU0939F1ZV').success).toBe(false)
  })

  it('rejects a GSTIN without the mandatory Z in position 14', () => {
    const noZ = '27AAPFU0939F1AV'
    expect(noZ[13]).not.toBe('Z')
    expect(gstinSchema.safeParse(noZ).success).toBe(false)
  })

  it('rejects a malformed PAN block', () => {
    // Characters 3–7 must be letters and 8–11 digits (the PAN shape).
    expect(gstinSchema.safeParse('2712345U0939F1ZV'.slice(0, 15)).success).toBe(false)
    expect(gstinSchema.safeParse('27AAPFUAAAAF1ZV').success).toBe(false)
  })

  it('rejects lowercase input rather than silently normalising it', () => {
    // .transform(toUpperCase) runs after .regex(), so lowercase never
    // reaches the transform — worth pinning so a future refactor that
    // reorders the chain does not start accepting unvalidated input.
    expect(gstinSchema.safeParse('27aapfu0939f1zv').success).toBe(false)
  })

  it('rejects whitespace-padded input', () => {
    expect(gstinSchema.safeParse(' 27AAPFU0939F1ZV').success).toBe(false)
    expect(gstinSchema.safeParse('27AAPFU0939F1ZV ').success).toBe(false)
  })
})

describe('hsnSchema', () => {
  it('accepts 4 to 8 digit HSN codes', () => {
    for (const code of ['7005', '70051010', '700510']) {
      expect(hsnSchema.parse(code)).toBe(code)
    }
  })

  it('rejects codes that are too short, too long, or non-numeric', () => {
    for (const code of ['700', '700510101', '7005A', '70 05', '']) {
      expect(hsnSchema.safeParse(code).success, `accepted "${code}"`).toBe(false)
    }
  })
})

describe('stateCodeSchema', () => {
  it('accepts the valid Indian state code range', () => {
    expect(stateCodeSchema.parse(1)).toBe(1)
    expect(stateCodeSchema.parse(27)).toBe(27)
    expect(stateCodeSchema.parse(38)).toBe(38)
  })

  it('rejects out-of-range and non-integer codes', () => {
    for (const code of [0, -1, 39, 99, 27.5]) {
      expect(stateCodeSchema.safeParse(code).success, `accepted ${code}`).toBe(false)
    }
  })
})
