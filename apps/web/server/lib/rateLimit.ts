import { TRPCError } from '@trpc/server'

const buckets = new Map<string, { count: number; resetAt: number }>()

export function enforceRateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (bucket.count >= limit) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `AI rate limit exceeded. Try again in ${Math.ceil((bucket.resetAt - now) / 1000)}s.`,
    })
  }

  bucket.count++
}
