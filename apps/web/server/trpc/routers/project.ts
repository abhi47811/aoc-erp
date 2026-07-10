import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, tenantProcedure, authorizedProcedure } from '../init'

const ProjectInput = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  client_id: z.string().uuid().optional(),
  architect_id: z.string().uuid().optional(),
  status: z.enum(['draft','active','on_hold','completed','cancelled']).optional(),
  site_address: z.string().optional(),
  estimated_value: z.string().optional(),
  start_date: z.string().optional(),
  expected_completion: z.string().optional(),
  description: z.string().optional(),
})

export const projectRouter = router({
  list: tenantProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('projects')
        .select('*, clients(name), architects(name)')
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
        .from('projects')
        .select('*, clients(name, mobile, email), architects(name, mobile)')
        .eq('id', input).eq('tenant_id', ctx.tenantId).single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND' })
      return data
    }),

  create: authorizedProcedure('MANAGE_CLIENTS')
    .input(ProjectInput)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('projects')
        .insert({ ...input, tenant_id: ctx.tenantId, created_by: ctx.user.id })
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  update: authorizedProcedure('MANAGE_CLIENTS')
    .input(z.object({ id: z.string().uuid(), data: ProjectInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('projects')
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
        .from('projects').delete()
        .eq('id', input).eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
