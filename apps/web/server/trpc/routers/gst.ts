import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import Anthropic from '@anthropic-ai/sdk'
import { router, tenantProcedure } from '../init'
import { enforceRateLimit } from '../../lib/rateLimit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const gstRouter = router({
  // List GST records for a period
  list: tenantProcedure
    .input(z.object({
      period: z.string().optional(),       // 'MMYYYY'
      return_type: z.enum(['gstr1', 'gstr2a', 'gstr3b']).optional(),
      matched: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('gst_records')
        .select('*, invoices(number, invoice_date)')
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
      if (input?.period) query = query.eq('period', input.period)
      if (input?.return_type) query = query.eq('return_type', input.return_type)
      if (input?.matched !== undefined) query = query.eq('matched', input.matched)
      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  // Auto-populate GSTR-1 from invoices for a period
  populateGSTR1: tenantProcedure
    .input(z.object({ period: z.string().min(6).max(6) }))   // 'MMYYYY'
    .mutation(async ({ ctx, input }) => {
      // Parse period
      const mm = input.period.substring(0, 2)
      const yyyy = input.period.substring(2, 6)
      const from = `${yyyy}-${mm}-01`
      // Last day of month
      const to = new Date(Number(yyyy), Number(mm), 0).toISOString().substring(0, 10)

      // Fetch posted invoices in period
      const { data: invoices, error: invErr } = await ctx.supabase
        .from('invoices')
        .select('id, number, total, cgst_amount, sgst_amount, igst_amount, subtotal, clients(gstin)')
        .eq('tenant_id', ctx.tenantId)
        .in('status', ['sent', 'paid', 'partial'])
        .gte('invoice_date', from)
        .lte('invoice_date', to)
      if (invErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: invErr.message })

      if (!invoices || invoices.length === 0) return { inserted: 0 }

      // Get tenant GSTIN from settings
      const { data: tenant } = await ctx.supabase
        .from('tenants')
        .select('gstin')
        .eq('id', ctx.tenantId)
        .single()

      const records = (invoices as any[]).map(inv => ({
        tenant_id: ctx.tenantId,
        return_type: 'gstr1' as const,
        period: input.period,
        gstin: (tenant as any)?.gstin ?? null,
        party_gstin: inv.clients?.gstin ?? null,
        invoice_id: inv.id,
        taxable_value: Number(inv.subtotal ?? 0),
        igst: Number(inv.igst_amount ?? 0),
        cgst: Number(inv.cgst_amount ?? 0),
        sgst: Number(inv.sgst_amount ?? 0),
      }))

      // Upsert (idempotent)
      const { error } = await ctx.supabase
        .from('gst_records')
        .upsert(records, { onConflict: 'invoice_id,return_type' })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return { inserted: records.length }
    }),

  // Import GSTR-2A records (uploaded by user)
  importGSTR2A: tenantProcedure
    .input(z.object({
      period: z.string().min(6).max(6),
      records: z.array(z.object({
        party_gstin: z.string(),
        taxable_value: z.number(),
        igst: z.number().default(0),
        cgst: z.number().default(0),
        sgst: z.number().default(0),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: tenant } = await ctx.supabase
        .from('tenants')
        .select('gstin')
        .eq('id', ctx.tenantId)
        .single()

      const rows = input.records.map(r => ({
        tenant_id: ctx.tenantId,
        return_type: 'gstr2a' as const,
        period: input.period,
        gstin: (tenant as any)?.gstin ?? null,
        ...r,
      }))

      const { error } = await ctx.supabase.from('gst_records').insert(rows)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { inserted: rows.length }
    }),

  // Reconcile GSTR-1 vs GSTR-2A for a period
  reconcile: tenantProcedure
    .input(z.object({ period: z.string().min(6).max(6) }))
    .mutation(async ({ ctx, input }) => {
      const { data: gstr1 } = await ctx.supabase
        .from('gst_records')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .eq('period', input.period)
        .eq('return_type', 'gstr1')

      const { data: gstr2a } = await ctx.supabase
        .from('gst_records')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .eq('period', input.period)
        .eq('return_type', 'gstr2a')

      const matched: string[] = []
      const unmatched: any[] = []

      for (const g1 of (gstr1 ?? []) as any[]) {
        const partner = (gstr2a ?? [] as any[]).find(
          (g2: any) =>
            g2.party_gstin === g1.party_gstin &&
            Math.abs(Number(g2.taxable_value) - Number(g1.taxable_value)) < 1
        )
        if (partner) {
          matched.push(g1.id)
          matched.push(partner.id)
        } else {
          unmatched.push({ type: 'gstr1', id: g1.id, party_gstin: g1.party_gstin, taxable_value: g1.taxable_value })
        }
      }

      // Mark matched records
      if (matched.length > 0) {
        await ctx.supabase
          .from('gst_records')
          .update({ matched: true, reconciled_at: new Date().toISOString() })
          .in('id', matched)
      }

      return {
        matched: matched.length / 2,
        unmatched: unmatched.length,
        unmatched_records: unmatched,
      }
    }),

  // Summary by period
  summary: tenantProcedure
    .input(z.object({ period: z.string().min(6).max(6) }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('gst_records')
        .select('return_type, taxable_value, igst, cgst, sgst, matched')
        .eq('tenant_id', ctx.tenantId)
        .eq('period', input.period)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const sum = (rows: any[], type: string) => {
        const r = (rows ?? []).filter((x: any) => x.return_type === type)
        return {
          count: r.length,
          taxable: r.reduce((s: number, x: any) => s + Number(x.taxable_value), 0),
          igst: r.reduce((s: number, x: any) => s + Number(x.igst ?? 0), 0),
          cgst: r.reduce((s: number, x: any) => s + Number(x.cgst ?? 0), 0),
          sgst: r.reduce((s: number, x: any) => s + Number(x.sgst ?? 0), 0),
          matched: r.filter((x: any) => x.matched).length,
        }
      }

      return {
        period: input.period,
        gstr1: sum(data ?? [], 'gstr1'),
        gstr2a: sum(data ?? [], 'gstr2a'),
        gstr3b: sum(data ?? [], 'gstr3b'),
      }
    }),

  delete: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('gst_records')
        .delete()
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { id: input }
    }),

  aiExplainUnmatched: tenantProcedure
    .input(z.object({
      period: z.string().min(6).max(6),
      unmatched: z.array(z.object({
        type: z.string(),
        party_gstin: z.string().nullable().optional(),
        taxable_value: z.union([z.string(), z.number()]),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`gst-ai:${ctx.tenantId}`, 10, 60_000)
      if (input.unmatched.length === 0) {
        return { explanation: 'No unmatched records to analyse.' }
      }

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: `You are a GST compliance assistant for an Indian business. Be concise and practical. All values are in INR.`,
        messages: [{
          role: 'user',
          content: `Period: ${input.period.substring(0, 2)}/${input.period.substring(2)}

The following GSTR-1 records have no matching GSTR-2A entry from the buyer's portal:

${input.unmatched.map((r, i) =>
  `${i + 1}. Buyer GSTIN: ${r.party_gstin ?? 'Not provided'} | Taxable value: ₹${Number(r.taxable_value).toLocaleString('en-IN')}`
).join('\n')}

In 3-5 bullet points explain:
• Why these mismatches typically occur (e.g. buyer filed late, GSTIN error, value difference)
• What action the business should take (chase buyer, file amendment, check GSTIN)
• Any ITC risk if left unresolved

Keep it practical, under 200 words.`,
        }],
      })

      const text = msg.content[0]?.type === 'text' ? msg.content[0].text : 'Unable to generate explanation.'
      return { explanation: text }
    }),
})
