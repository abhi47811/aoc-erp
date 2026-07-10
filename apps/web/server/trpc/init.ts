import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import type { Context } from './context'
import { hasPermission, type Permission } from '@/lib/rbac'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

// Requires auth — throws UNAUTHORIZED if not logged in
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})

// Requires auth + tenant — throws FORBIDDEN if user has no tenant yet
export const tenantProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.tenantId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Onboarding required' })
  }
  return next({ ctx: { ...ctx, tenantId: ctx.tenantId, userRole: ctx.userRole } })
})

// Requires auth + tenant + specific RBAC permission
export function authorizedProcedure(permission: Permission) {
  return tenantProcedure.use(({ ctx, next }) => {
    if (!hasPermission(ctx.userRole, permission)) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }
    return next({ ctx })
  })
}
