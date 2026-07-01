import { z } from 'zod'
import { gstinSchema } from './gstin'

export const tenantSchema = z.object({
  name: z.string().min(2).max(100),
  legal_name: z.string().min(2).max(200),
  gstin: gstinSchema.optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  email: z.string().email(),
  state_code: z.number().int().min(1).max(38).optional(),
})

export type TenantInput = z.infer<typeof tenantSchema>
