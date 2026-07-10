import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, tenantProcedure } from '../init'

function waLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export const whatsappRouter = router({
  // ── Link generator ───────────────────────────────────────────────────────
  generateLink: tenantProcedure
    .input(z.object({
      phone_number: z.string().min(10),
      message: z.string().min(1),
    }))
    .mutation(({ input }) => ({
      url: waLink(input.phone_number, input.message),
    })),

  // ── Quick templates ─────────────────────────────────────────────────────
  sendQuotationReady: tenantProcedure
    .input(z.object({
      phone_number: z.string(),
      contact_name: z.string(),
      quotation_number: z.string(),
      amount: z.number(),
      entity_id: z.string().uuid().optional(),
    }))
    .mutation(({ input }) => {
      const message = `Hi ${input.contact_name},\n\nYour quotation *${input.quotation_number}* for ₹${input.amount.toLocaleString()} is ready for review.\n\nPlease contact us to confirm your order.\n\n– AOC Glass`
      return { url: waLink(input.phone_number, message), message }
    }),

  sendDeliveryUpdate: tenantProcedure
    .input(z.object({
      phone_number: z.string(),
      contact_name: z.string(),
      order_ref: z.string(),
      estimated_date: z.string(),
      entity_id: z.string().uuid().optional(),
    }))
    .mutation(({ input }) => {
      const message = `Hi ${input.contact_name},\n\nYour order *${input.order_ref}* is scheduled for delivery on *${input.estimated_date}*.\n\nWe'll send another update when it's out for delivery.\n\n– AOC Glass`
      return { url: waLink(input.phone_number, message), message }
    }),

  // ── Message log (read-only, kept for historical data) ───────────────────
  listMessages: tenantProcedure
    .input(z.object({
      phone_number: z.string().optional(),
      entity_type: z.string().optional(),
      entity_id: z.string().uuid().optional(),
      limit: z.number().int().max(200).default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
        .limit(input?.limit ?? 50)
      if (input?.phone_number) query = query.eq('phone_number', input.phone_number)
      if (input?.entity_type) query = query.eq('entity_type', input.entity_type)
      if (input?.entity_id) query = query.eq('entity_id', input.entity_id)
      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  stats: tenantProcedure.query(async ({ ctx }) => {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    const { data } = await ctx.supabase
      .from('whatsapp_messages')
      .select('direction, status, created_at')
      .eq('tenant_id', ctx.tenantId)
      .gte('created_at', since)
    const list = (data ?? []) as any[]
    return {
      total: list.length,
      outbound: list.filter(m => m.direction === 'outbound').length,
      inbound: list.filter(m => m.direction === 'inbound').length,
      failed: list.filter(m => m.status === 'failed').length,
      delivered: list.filter(m => m.status === 'delivered').length,
    }
  }),
})
