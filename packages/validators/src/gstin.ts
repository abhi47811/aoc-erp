import { z } from 'zod'

// GSTIN: 15-char alphanumeric with checksum
// Format: 2-digit state code + 10-char PAN + 1-digit entity + Z + checksum
const GSTIN_REGEX = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function computeGstinChecksum(gstin: string): string {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const val = GSTIN_CHARS.indexOf(gstin[i]!)
    const factor = i % 2 === 0 ? 1 : 2
    const product = val * factor
    sum += Math.floor(product / 36) + (product % 36)
  }
  const remainder = sum % 36
  return GSTIN_CHARS[36 - remainder === 36 ? 0 : 36 - remainder]!
}

export const gstinSchema = z
  .string()
  .length(15, 'GSTIN must be 15 characters')
  .regex(GSTIN_REGEX, 'Invalid GSTIN format')
  .refine((gstin) => {
    const expectedChecksum = computeGstinChecksum(gstin)
    return gstin[14] === expectedChecksum
  }, 'Invalid GSTIN checksum')
  .transform((v) => v.toUpperCase())

export const hsnSchema = z
  .string()
  .regex(/^\d{4,8}$/, 'HSN must be 4–8 digits')

export const stateCodeSchema = z
  .number()
  .int()
  .min(1)
  .max(38)

export type Gstin = z.infer<typeof gstinSchema>
export type Hsn = z.infer<typeof hsnSchema>
