import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, tenantProcedure } from '../init'

export const activityRouter = router({
  // Activity history for one record, sourced from the audit_log triggers.
  list: tenantProcedure
    .input(z.object({ table_name: z.string(), record_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('audit_log')
        .select('id, action, user_id, old_data, new_data, created_at')
        .eq('tenant_id', ctx.tenantId)
        .eq('table_name', input.table_name)
        .eq('record_id', input.record_id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const userIds = [...new Set((data ?? []).map((r: any) => r.user_id).filter(Boolean))]
      let usersById: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: users } = await ctx.supabase.from('users').select('id, name').in('id', userIds)
        usersById = Object.fromEntries((users ?? []).map((u: any) => [u.id, u.name as string]))
      }

      return (data ?? []).map((row: any) => ({
        id: row.id,
        action: row.action as 'INSERT' | 'UPDATE' | 'DELETE',
        created_at: row.created_at,
        user_name: row.user_id ? (usersById[row.user_id] ?? 'Unknown user') : 'System',
        old_data: row.old_data,
        new_data: row.new_data,
      }))
    }),
})
