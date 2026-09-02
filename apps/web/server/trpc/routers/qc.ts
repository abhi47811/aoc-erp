import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import Anthropic from '@anthropic-ai/sdk'
import { router, tenantProcedure, authorizedProcedure } from '../init'
import { enforceRateLimit } from '../../lib/rateLimit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const qcRouter = router({
  listChecks: tenantProcedure
    .input(z.object({
      status: z.enum(['pending', 'passed', 'failed']).optional(),
      limit: z.number().int().max(200).default(100),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('qc_checks')
        .select('*, work_orders(number, clients(name))')
        .eq('tenant_id', ctx.tenantId)
        .order('check_name')
        .limit(input?.limit ?? 100)
      if (input?.status) query = query.eq('status', input.status)
      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  getChecks: tenantProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('qc_checks')
        .select('*')
        .eq('wo_id', input)
        .eq('tenant_id', ctx.tenantId)
        .order('check_name')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  upsertChecks: authorizedProcedure('VIEW_QC')
    .input(z.object({
      wo_id: z.string().uuid(),
      checks: z.array(z.object({
        check_name: z.string().min(1).max(200),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const rows = input.checks.map(c => ({
        wo_id: input.wo_id,
        tenant_id: ctx.tenantId,
        check_name: c.check_name,
        status: 'pending' as const,
      }))
      const { error } = await ctx.supabase.from('qc_checks').insert(rows)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  updateCheck: authorizedProcedure('VIEW_QC')
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['pending', 'passed', 'failed']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const patch: Record<string, unknown> = {
        status: input.status,
        checked_by: ctx.user.id,
        checked_at: new Date().toISOString(),
      }
      if (input.notes !== undefined) patch.notes = input.notes

      const { error } = await ctx.supabase
        .from('qc_checks')
        .update(patch)
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  deleteCheck: authorizedProcedure('MANAGE_QC')
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('qc_checks')
        .delete()
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  analyzePhoto: authorizedProcedure('VIEW_QC')
    .input(z.object({
      checkName: z.string(),
      imageBase64: z.string(),
      mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
    }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`qc-analyze:${ctx.tenantId}`, 10, 60_000)

      try {
        const msg = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: input.mediaType, data: input.imageBase64 },
              },
              {
                type: 'text',
                text: `You are a QC inspector for a glass fabrication company. Analyze this photo for the check: "${input.checkName}". In 1-2 sentences, describe what you see and whether it PASSES or FAILS this check. Be specific about any visible defects (chips, scratches, measurement deviations, coating issues). Start with PASS or FAIL in caps.`,
              },
            ],
          }],
        })
        const text = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : 'Unable to analyze image.'
        return { analysis: text }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Photo analysis failed'
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg })
      }
    }),
})
