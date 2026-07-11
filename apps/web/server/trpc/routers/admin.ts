import { TRPCError } from '@trpc/server'
import { protectedProcedure, router } from '../init'
import { createClient } from '@supabase/supabase-js'

// Admin procedures use service role — only for owner role
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.userRole !== 'owner') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({ ctx })
})

export const adminRouter = router({
  tenants: adminProcedure.query(async () => {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select(`
        id,
        name,
        created_at,
        status,
        users (
          id
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    return (data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      created_at: t.created_at,
      status: t.status ?? 'trialing',
      users: (t.users ?? []).length,
    }))
  }),
})
