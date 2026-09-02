import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../init'
import { createAdminClient } from '@/lib/supabase/admin'

export const shareRouter = router({
  getByToken: publicProcedure
    .input(z.string())
    .query(async ({ input: token }) => {
      const admin = createAdminClient()

      const { data: tokenRecord, error: te } = await admin
        .from('project_share_tokens')
        .select('*')
        .eq('token', token)
        .eq('is_active', true)
        .single()

      if (te || !tokenRecord) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid or expired link' })
      }

      if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Link has expired' })
      }

      const { data: project, error: pe } = await admin
        .from('projects')
        .select('id, code, name, status, site_address, description')
        .eq('id', tokenRecord.project_id)
        .single()

      if (pe || !project) throw new TRPCError({ code: 'NOT_FOUND' })

      const { data: drawingsList } = await admin
        .from('drawings')
        .select('*')
        .eq('project_id', tokenRecord.project_id)
        .order('created_at', { ascending: true })

      const drawings = drawingsList ?? []
      // Batch all signed-URL requests into a single Storage API call instead of
      // one round trip per drawing.
      const urlByPath = new Map<string, string | null>()
      if (drawings.length > 0) {
        const { data: signedUrls } = await admin.storage
          .from('drawings')
          .createSignedUrls(drawings.map(d => d.file_path), 3600)
        for (const u of signedUrls ?? []) {
          if (u.path) urlByPath.set(u.path, u.signedUrl)
        }
      }
      const withUrls = drawings.map(d => ({ ...d, view_url: urlByPath.get(d.file_path) ?? null }))

      return { project, drawings: withUrls }
    }),
})
