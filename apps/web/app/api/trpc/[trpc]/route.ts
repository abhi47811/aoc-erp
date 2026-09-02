import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { createTRPCContext } from '@/server/trpc/context'
import { appRouter } from '@/server/trpc/router'

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ error, path, type, ctx }) {
      // Structured log so failures are searchable in Vercel's function logs
      // (grep by "[trpc error]", procedure, or tenantId) instead of being
      // swallowed or logged inconsistently per-router.
      console.error('[trpc error]', {
        procedure: path ?? '<unknown>',
        type,
        code: error.code,
        message: error.message,
        tenantId: ctx?.tenantId ?? null,
        userId: ctx?.user?.id ?? null,
      })
    },
  })

export { handler as GET, handler as POST }
