import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { tenantProcedure, authorizedProcedure, router } from '../init'

const UpdateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  legal_name: z.string().min(2).max(200).optional(),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional().or(z.literal('')),
  mobile: z.string().regex(/^[6-9]\d{9}$/).optional(),
  email: z.string().email().optional(),
  state_code: z.number().int().min(1).max(38).optional(),
  logo_url: z.string().url().optional().or(z.literal('')),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  invoice_prefix: z.string().max(10).optional(),
  quote_prefix: z.string().max(10).optional(),
  po_prefix: z.string().max(10).optional(),
  so_prefix: z.string().max(10).optional(),
  pi_prefix: z.string().max(10).optional(),
})

export const tenantRouter = router({
  // Get current tenant
  get: tenantProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('tenants')
      .select('*')
      .eq('id', ctx.tenantId)
      .single()

    if (error) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant not found' })
    return data
  }),

  // Update tenant settings — requires MANAGE_TENANT permission
  update: authorizedProcedure('MANAGE_TENANT')
    .input(UpdateTenantSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('tenants')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', ctx.tenantId)
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  // Get tax rates for current tenant
  taxRates: tenantProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('tax_rates')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .eq('is_active', true)
      .order('rate', { ascending: true })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  // Get approval workflows for current tenant
  approvalWorkflows: tenantProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('approval_workflows')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .eq('is_active', true)
      .order('module')
      .order('level')

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),
})
