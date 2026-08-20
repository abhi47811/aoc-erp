import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { randomBytes } from 'node:crypto'
import { router, tenantProcedure } from '../init'
import { extractGlassMeasurements } from '@aoc/ai'
import { enforceRateLimit } from '../../lib/rateLimit'

export const drawingRouter = router({
  list: tenantProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('drawings')
        .select('*')
        .eq('project_id', input)
        .order('created_at', { ascending: false })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  listAll: tenantProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('drawings')
        .select('id, title, ai_status, mime_type, created_at, project_id, projects(code, name)')
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  create: tenantProcedure
    .input(z.object({
      project_id: z.string().uuid(),
      title: z.string().min(1).max(200),
      file_path: z.string(),
      file_size: z.number().optional(),
      mime_type: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('drawings')
        .insert({
          tenant_id: ctx.tenantId,
          project_id: input.project_id,
          title: input.title,
          file_path: input.file_path,
          ...(input.file_size !== undefined ? { file_size: String(input.file_size) } : {}),
          ...(input.mime_type !== undefined ? { mime_type: input.mime_type } : {}),
        })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  delete: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { data: drawing } = await ctx.supabase
        .from('drawings')
        .select('file_path')
        .eq('id', input)
        .single()

      if (drawing?.file_path) {
        await ctx.supabase.storage.from('drawings').remove([drawing.file_path])
      }

      const { error } = await ctx.supabase.from('drawings').delete().eq('id', input)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  getViewUrl: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { data: drawing, error: de } = await ctx.supabase
        .from('drawings').select('file_path').eq('id', input).single()
      if (de || !drawing) throw new TRPCError({ code: 'NOT_FOUND' })

      const { data, error } = await ctx.supabase.storage
        .from('drawings')
        .createSignedUrl(drawing.file_path, 3600)
      if (error || !data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message })
      return { url: data.signedUrl }
    }),

  extract: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`drawing-extract:${ctx.tenantId}`, 10, 60_000)

      const { data: drawing, error: de } = await ctx.supabase
        .from('drawings').select('file_path, mime_type').eq('id', input).single()
      if (de || !drawing) throw new TRPCError({ code: 'NOT_FOUND' })

      await ctx.supabase.from('drawings').update({ ai_status: 'processing' }).eq('id', input)

      try {
        const { data: blob, error: dlErr } = await ctx.supabase.storage
          .from('drawings').download(drawing.file_path)
        if (dlErr || !blob) throw new Error(dlErr?.message ?? 'Download failed')

        const buf = Buffer.from(await blob.arrayBuffer())
        const mimeType = (drawing.mime_type ?? 'image/jpeg') as
          'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf'

        const result = await extractGlassMeasurements(buf.toString('base64'), mimeType)

        await ctx.supabase.from('drawings')
          .update({ ai_status: 'done', ai_extracted: result })
          .eq('id', input)

        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await ctx.supabase.from('drawings')
          .update({ ai_status: 'failed', ai_error: msg })
          .eq('id', input)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg })
      }
    }),

  createShareToken: tenantProcedure
    .input(z.object({
      project_id: z.string().uuid(),
      label: z.string().optional(),
      expires_days: z.number().positive().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const token = randomBytes(32).toString('hex')
      const expiresAt = input.expires_days
        ? new Date(Date.now() + input.expires_days * 86400000).toISOString()
        : undefined

      const { data, error } = await ctx.supabase
        .from('project_share_tokens')
        .insert({
          tenant_id: ctx.tenantId,
          project_id: input.project_id,
          token,
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(expiresAt !== undefined ? { expires_at: expiresAt } : {}),
          created_by: ctx.user.id,
        })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  listShareTokens: tenantProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('project_share_tokens')
        .select('*')
        .eq('project_id', input)
        .order('created_at', { ascending: false })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  revokeShareToken: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('project_share_tokens')
        .update({ is_active: false })
        .eq('id', input)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
