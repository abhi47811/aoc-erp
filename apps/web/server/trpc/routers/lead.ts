import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, tenantProcedure, authorizedProcedure } from '../init'

const LeadInput = z.object({
  name: z.string().min(1).max(200),
  company: z.string().max(200).optional(),
  email: z.string().optional(),
  mobile: z.string().optional(),
  source: z.enum(['walk_in','referral','cold_call','social','website','exhibition','other']).optional(),
  status: z.enum(['new','contacted','qualified','proposal_sent','won','lost']).optional(),
  assigned_to: z.string().uuid().optional(),
  notes: z.string().optional(),
})

export const leadRouter = router({
  list: tenantProcedure
    .input(z.object({ status: z.string().optional(), search: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
      if (input?.status) query = query.eq('status', input.status)
      if (input?.search) query = query.ilike('name', `%${input.search}%`)
      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  get: tenantProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('leads').select('*')
        .eq('id', input).eq('tenant_id', ctx.tenantId).single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND' })
      return data
    }),

  create: authorizedProcedure('MANAGE_LEADS')
    .input(LeadInput)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('leads')
        .insert({ ...input, tenant_id: ctx.tenantId, created_by: ctx.user.id })
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  update: authorizedProcedure('MANAGE_LEADS')
    .input(z.object({ id: z.string().uuid(), data: LeadInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('leads')
        .update({ ...input.data, updated_at: new Date().toISOString() })
        .eq('id', input.id).eq('tenant_id', ctx.tenantId)
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  delete: authorizedProcedure('MANAGE_LEADS')
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('leads').delete()
        .eq('id', input).eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
