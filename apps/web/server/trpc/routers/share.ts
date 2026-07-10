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

      const withUrls = await Promise.all(
        (drawingsList ?? []).map(async (d) => {
          const { data: url } = await admin.storage
            .from('drawings')
            .createSignedUrl(d.file_path, 3600)
          return { ...d, view_url: url?.signedUrl ?? null }
        })
      )

      return { project, drawings: withUrls }
    }),
})
