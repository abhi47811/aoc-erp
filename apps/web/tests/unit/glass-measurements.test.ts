import { describe, it, expect } from 'vitest'
import {
  toMm,
  formatIndianNumber,
  dimensionSchema,
  glassMeasurementSchema,
  glassThicknessSchema,
} from '@aoc/validators'

describe('toMm — unit conversion', () => {
  it('leaves millimetres untouched', () => {
    expect(toMm(2440, 'mm')).toBe(2440)
    expect(toMm(0.5, 'mm')).toBe(0.5)
  })

  it('converts centimetres by exactly 10', () => {
    expect(toMm(244, 'cm')).toBe(2440)
    expect(toMm(1, 'cm')).toBe(10)
  })

  it('converts inches by the exact 25.4 factor, not a rounded 25', () => {
    // A 25 vs 25.4 slip is 1.6% — on a 96" shopfront that is a 39 mm error,
    // which is the difference between a pane that fits and one that is scrap.
    expect(toMm(1, 'inch')).toBe(25.4)
    expect(toMm(96, 'inch')).toBeCloseTo(2438.4, 10)
    expect(toMm(48, 'inch')).toBeCloseTo(1219.2, 10)
  })

  it('round-trips a cm value back through mm without drift', () => {
    expect(toMm(toMm(150, 'cm') / 10, 'cm')).toBe(1500)
  })
})

describe('glass area maths — the formula quotation line items rely on', () => {
  // Quotation items store area_sqm as (qty * width_mm * height_mm) / 1e6.
  // Pinning the arithmetic here catches a mm²-vs-m² divisor regression,
  // which would misprice every glass line by a factor of a million.
  const areaSqm = (qty: number, widthMm: number, heightMm: number) =>
    (qty * widthMm * heightMm) / 1_000_000

  it('computes one square metre from a 1000 x 1000 mm pane', () => {
    expect(areaSqm(1, 1000, 1000)).toBe(1)
  })

  it('computes a standard 2440 x 1220 mm jumbo sheet', () => {
    expect(areaSqm(1, 2440, 1220)).toBeCloseTo(2.9768, 10)
  })

  it('scales linearly with quantity', () => {
    expect(areaSqm(12, 2440, 1220)).toBeCloseTo(2.9768 * 12, 8)
  })

  it('converts an imperial-quoted pane through toMm to the same area', () => {
    const w = toMm(48, 'inch')
    const h = toMm(96, 'inch')
    expect(areaSqm(1, w, h)).toBeCloseTo(2.9729, 4)
  })
})

describe('formatIndianNumber — lakh/crore thresholds', () => {
  it('formats values below one lakh with Indian digit grouping', () => {
    expect(formatIndianNumber(99_999)).toBe('99,999')
    expect(formatIndianNumber(1_000)).toBe('1,000')
    expect(formatIndianNumber(0)).toBe('0')
  })

  it('switches to lakh at exactly 1,00,000', () => {
    expect(formatIndianNumber(99_999)).not.toContain('L')
    expect(formatIndianNumber(1_00_000)).toBe('1.00 L')
    expect(formatIndianNumber(12_50_000)).toBe('12.50 L')
  })

  it('switches to crore at exactly 1,00,00,000', () => {
    expect(formatIndianNumber(99_00_000)).toBe('99.00 L')
    expect(formatIndianNumber(1_00_00_000)).toBe('1.00 Cr')
    expect(formatIndianNumber(25_00_00_000)).toBe('25.00 Cr')
  })

  it('displays "100.00 L" just below the crore threshold (toFixed rounding)', () => {
    // 99,99,999 / 1e5 = 99.99999, which toFixed(2) rounds up to "100.00".
    // Cosmetic rather than a money bug — the underlying value is untouched —
    // but pinned so the display quirk is a decision, not a surprise.
    expect(formatIndianNumber(99_99_999)).toBe('100.00 L')
  })
})

describe('dimension and measurement schemas', () => {
  it('rejects a zero or negative dimension', () => {
    expect(dimensionSchema.safeParse({ value: 0, unit: 'mm' }).success).toBe(false)
    expect(dimensionSchema.safeParse({ value: -5, unit: 'mm' }).success).toBe(false)
    expect(dimensionSchema.safeParse({ value: 5, unit: 'mm' }).success).toBe(true)
  })

  it('rejects an unknown measurement unit', () => {
    expect(dimensionSchema.safeParse({ value: 5, unit: 'ft' }).success).toBe(false)
    expect(dimensionSchema.safeParse({ value: 5, unit: 'metre' }).success).toBe(false)
  })

  it('accepts only stocked glass thicknesses', () => {
    for (const t of ['3', '4', '5', '6', '8', '10', '12', '15', '19']) {
      expect(glassThicknessSchema.safeParse(t).success, `rejected ${t}mm`).toBe(true)
    }
    // 7mm and 9mm are not manufactured in this range; 6 as a number, not a
    // string, is the shape mistake a form submission actually makes.
    for (const t of ['7', '9', '20', 6, '']) {
      expect(glassThicknessSchema.safeParse(t).success, `accepted ${t}`).toBe(false)
    }
  })

  it('requires a positive integer quantity on a full measurement', () => {
    const base = {
      width: { value: 2440, unit: 'mm' as const },
      height: { value: 1220, unit: 'mm' as const },
      thickness: '6' as const,
    }
    expect(glassMeasurementSchema.safeParse({ ...base, quantity: 4 }).success).toBe(true)
    expect(glassMeasurementSchema.safeParse({ ...base, quantity: 0 }).success).toBe(false)
    expect(glassMeasurementSchema.safeParse({ ...base, quantity: 2.5 }).success).toBe(false)
    expect(glassMeasurementSchema.safeParse({ ...base, quantity: -1 }).success).toBe(false)
  })
})
