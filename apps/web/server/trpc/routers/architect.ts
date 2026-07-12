import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { extractBusinessCard } from '@aoc/ai'
import { router, tenantProcedure, authorizedProcedure } from '../init'

const ArchitectInput = z.object({
  name: z.string().min(1).max(200),
  firm_name: z.string().optional(),
  email: z.string().optional(),
  mobile: z.string().optional(),
  commission_pct: z.string().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
})

export const architectRouter = router({
  list: tenantProcedure
    .input(z.object({ search: z.string().optional(), active_only: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('architects').select('*')
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
        .from('architects').select('*')
        .eq('id', input).eq('tenant_id', ctx.tenantId).single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND' })
      return data
    }),

  create: authorizedProcedure('MANAGE_CLIENTS')
    .input(ArchitectInput)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('architects')
        .insert({ ...input, tenant_id: ctx.tenantId })
        .select().single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  update: authorizedProcedure('MANAGE_CLIENTS')
    .input(z.object({ id: z.string().uuid(), data: ArchitectInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('architects')
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
        .from('architects').delete()
        .eq('id', input).eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  extractCard: authorizedProcedure('MANAGE_CLIENTS')
    .input(z.object({
      imageBase64: z.string(),
      mediaType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
    }))
    .mutation(async ({ input }) => {
      try {
        return await extractBusinessCard(input.imageBase64, input.mediaType)
      } catch (err) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err instanceof Error ? err.message : 'Card scan failed' })
      }
    }),
})
