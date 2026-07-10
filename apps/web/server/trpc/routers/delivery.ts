import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, tenantProcedure } from '../init'

export const deliveryRouter = router({
  list: tenantProcedure
    .input(z.object({
      status: z.enum(['pending', 'in_transit', 'delivered', 'failed']).optional(),
      limit: z.number().int().max(200).default(100),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('deliveries')
        .select('*, work_orders(number, clients(name))')
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
        .limit(input?.limit ?? 100)
      if (input?.status) query = query.eq('status', input.status)
      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  get: tenantProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('deliveries')
        .select('*, work_orders(number, clients(name))')
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
        .single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: error.message })
      return data
    }),

  listForWO: tenantProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('deliveries')
        .select('*')
        .eq('wo_id', input)
        .eq('tenant_id', ctx.tenantId)
        .order('created_at')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  create: tenantProcedure
    .input(z.object({
      wo_id: z.string().uuid(),
      number: z.string().min(1).max(50),
      driver_name: z.string().optional(),
      vehicle_number: z.string().optional(),
      scheduled_date: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('deliveries')
        .insert({
          ...input,
          tenant_id: ctx.tenantId,
          created_by: ctx.user.id,
        })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  updateStatus: tenantProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['pending', 'in_transit', 'delivered', 'failed']),
    }))
    .mutation(async ({ ctx, input }) => {
      const patch: Record<string, unknown> = {
        status: input.status,
        updated_at: new Date().toISOString(),
      }
      if (input.status === 'delivered') patch.delivered_at = new Date().toISOString()

      const { error } = await ctx.supabase
        .from('deliveries')
        .update(patch)
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  recordPOD: tenantProcedure
    .input(z.object({
      id: z.string().uuid(),
      pod_notes: z.string().optional(),
      pod_signature: z.any().optional(),
      pod_photo_urls: z.array(z.string()).optional(),
      gps_lat: z.number().optional(),
      gps_lng: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input
      const patch: Record<string, unknown> = {
        ...rest,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error } = await ctx.supabase
        .from('deliveries')
        .update(patch)
        .eq('id', id)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
