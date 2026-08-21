import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import Anthropic from '@anthropic-ai/sdk'
import { router, tenantProcedure } from '../init'
import { enforceRateLimit } from '../../lib/rateLimit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const WOItemInput = z.object({
  description: z.string().min(1),
  glass_type: z.string().optional(),
  thickness_mm: z.number().optional(),
  width_mm: z.number().optional(),
  height_mm: z.number().optional(),
  qty: z.number().positive().default(1),
  bom_id: z.string().uuid().optional(),
  sort_order: z.number().int().optional(),
})

const WO_STATUSES = ['draft','cutting','grinding','tempering','laminating','assembly','qc','dispatch','delivered','cancelled'] as const

export const workOrderRouter = router({
  list: tenantProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from('work_orders')
        .select('*, clients(name), projects(name)')
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
      if (input?.status) q = q.eq('status', input.status)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  get: tenantProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('work_orders')
        .select('*, clients(name), projects(name), work_order_items(*), qc_checks(*), deliveries(*)')
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
        .single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: error.message })
      return data
    }),

  create: tenantProcedure
    .input(z.object({
      number: z.string().min(1).max(50),
      project_id: z.string().uuid().optional(),
      client_id: z.string().uuid().optional(),
      invoice_id: z.string().uuid().optional(),
      due_date: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(WOItemInput).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { items, ...header } = input
      const { data: wo, error: woErr } = await ctx.supabase
        .from('work_orders')
        .insert({
          ...header,
          tenant_id: ctx.tenantId,
          created_by: ctx.user.id,
        })
        .select()
        .single()
      if (woErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: woErr.message })

      if (items && items.length > 0) {
        const rows = items.map((it, i) => ({
          ...it,
          wo_id: wo.id,
          tenant_id: ctx.tenantId,
          sort_order: it.sort_order ?? i,
        }))
        const { error: itemErr } = await ctx.supabase.from('work_order_items').insert(rows)
        if (itemErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: itemErr.message })
      }
      return wo
    }),

  update: tenantProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        number: z.string().min(1).max(50).optional(),
        project_id: z.string().uuid().optional(),
        client_id: z.string().uuid().optional(),
        invoice_id: z.string().uuid().optional(),
        due_date: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(WOItemInput).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const { items, ...rest } = input.data
      const patch: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() }

      if (items) {
        await ctx.supabase.from('work_order_items').delete().eq('wo_id', input.id).eq('tenant_id', ctx.tenantId)
        if (items.length > 0) {
          const rows = items.map((it, i) => ({
            ...it,
            wo_id: input.id,
            tenant_id: ctx.tenantId,
            sort_order: it.sort_order ?? i,
          }))
          await ctx.supabase.from('work_order_items').insert(rows)
        }
      }

      const { error } = await ctx.supabase
        .from('work_orders')
        .update(patch)
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  updateStatus: tenantProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(WO_STATUSES),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('work_orders')
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  delete: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('work_orders')
        .delete()
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  detectAnomalies: tenantProcedure
    .mutation(async ({ ctx }) => {
      enforceRateLimit(`anomaly:${ctx.tenantId}`, 10, 60_000)
      const { data: wos, error } = await ctx.supabase
        .from('work_orders')
        .select('*, clients(name), work_order_items(*)')
        .eq('tenant_id', ctx.tenantId)
        .not('status', 'in', '("delivered","cancelled")')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const today = new Date().toISOString().substring(0, 10)
      const summary = (wos ?? []).map((wo: any) => ({
        id: wo.id,
        number: wo.number,
        client: wo.clients?.name ?? 'Unknown',
        status: wo.status,
        due_date: wo.due_date ?? null,
        days_overdue: wo.due_date && wo.due_date < today
          ? Math.floor((Date.now() - new Date(wo.due_date).getTime()) / 86400000)
          : 0,
        item_count: (wo.work_order_items ?? []).length,
        items: (wo.work_order_items ?? []).map((it: any) => ({
          description: it.description,
          qty: it.qty,
          width_mm: it.width_mm,
          height_mm: it.height_mm,
          thickness_mm: it.thickness_mm,
          glass_type: it.glass_type,
        })),
      }))

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `You are a QA analyst for a glass fabrication ERP. Analyze work orders for anomalies. Respond ONLY with valid JSON — no prose. All monetary values are INR.`,
        messages: [{
          role: 'user',
          content: `Analyze these active work orders and return a JSON object with key "anomalies" — an array where each item has:
- wo_number (string)
- severity: "high" | "medium" | "low"
- type: short category (e.g. "overdue", "no_items", "suspicious_dimensions", "duplicate_client", "large_qty")
- message: one concise sentence explaining the issue

Rules for flagging:
- days_overdue > 0: flag as overdue (high if > 7 days, medium otherwise)
- item_count === 0: flag no_items (high)
- Any item with width_mm or height_mm > 4000 or < 100: suspicious_dimensions (medium)
- Any item with qty > 50: large_qty (medium)
- Same client appearing > 3 times in draft status: flag duplicate_client (low)
- WO in "cutting" or "grinding" stage with no due_date: flag missing_due_date (low)

Return { "anomalies": [] } if nothing found.

Work orders: ${JSON.stringify(summary)}`,
        }],
      })

      const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '{}'
      try {
        const parsed = JSON.parse(text)
        return { anomalies: parsed.anomalies ?? [] }
      } catch {
        return { anomalies: [] }
      }
    }),
})
