import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, tenantProcedure, authorizedProcedure } from '../init'

const ClientInput = z.object({
  name: z.string().min(1).max(200),
  contact_person: z.string().optional(),
  email: z.string().optional(),
  mobile: z.string().optional(),
  gstin: z.string().optional(),
  billing_address: z.string().optional(),
  shipping_address: z.string().optional(),
  state_code: z.number().int().optional(),
  credit_limit: z.string().optional(),
  payment_terms_days: z.number().int().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
})

export const clientRouter = router({
  list: tenantProcedure
    .input(z.object({ search: z.string().optional(), active_only: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('clients').select('*')
        .eq('tenant_id', ctx.tenantId)
        .order('name', { ascending: true })
      if (input?.active_only) query = query.eq('is_active', true)
      if (input?.search) query = query.ilike('name', `%${input.search}%`)
      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  get: tenantProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('clients').select('*')
        .eq('id', input).eq('tenant_id', ctx.tenantId).single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND' })
      return data
    }),

  create: authorizedProcedure('MANAGE_CLIENTS')
    .input(ClientInput)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('clients')
        .insert({ ...input, tenant_id: ctx.tenantId })
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  update: authorizedProcedure('MANAGE_CLIENTS')
    .input(z.object({ id: z.string().uuid(), data: ClientInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('clients')
        .update({ ...input.data, updated_at: new Date().toISOString() })
        .eq('id', input.id).eq('tenant_id', ctx.tenantId)
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  delete: authorizedProcedure('MANAGE_CLIENTS')
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('clients').delete()
        .eq('id', input).eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
