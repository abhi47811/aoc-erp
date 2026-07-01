import { z } from 'zod'

export const measurementUnitSchema = z.enum(['mm', 'cm', 'inch'])

export const dimensionSchema = z.object({
  value: z.number().positive('Must be positive'),
  unit: measurementUnitSchema,
})

// Convert any unit to mm
export function toMm(value: number, unit: z.infer<typeof measurementUnitSchema>): number {
  switch (unit) {
    case 'mm': return value
    case 'cm': return value * 10
    case 'inch': return value * 25.4
  }
}

export const glassThicknessSchema = z.enum(['3', '4', '5', '6', '8', '10', '12', '15', '19'])

export const glassMeasurementSchema = z.object({
  width: dimensionSchema,
  height: dimensionSchema,
  thickness: glassThicknessSchema,
  quantity: z.number().int().positive(),
})

// Indian currency formatting
export function formatINR(paise: number): string {
  const rupees = paise / 100
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return formatter.format(rupees)
}

export function formatIndianNumber(n: number): string {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(2)} Cr`
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(2)} L`
  return n.toLocaleString('en-IN')
}
