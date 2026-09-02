import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TRPCError } from '@trpc/server'
import { randomUUID } from 'node:crypto'
import { enforceRateLimit } from '@/server/lib/rateLimit'

// The bucket map is module-level and shared, so every test uses a fresh key
// rather than trying to reset internal state it does not own.
const freshKey = () => `test:${randomUUID()}`

describe('enforceRateLimit — this is what caps per-tenant Anthropic spend', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows exactly `limit` calls and throws on the next one', () => {
    const key = freshKey()
    for (let i = 1; i <= 5; i++) {
      expect(() => enforceRateLimit(key, 5, 60_000), `call ${i} was rejected`).not.toThrow()
    }
    expect(() => enforceRateLimit(key, 5, 60_000)).toThrow(TRPCError)
  })

  it('throws TOO_MANY_REQUESTS, not a generic error', () => {
    // The tRPC code decides the HTTP status the client sees (429), so the
    // code matters as much as the throw.
    const key = freshKey()
    enforceRateLimit(key, 1, 60_000)
    try {
      enforceRateLimit(key, 1, 60_000)
      expect.unreachable('second call should have been rate limited')
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError)
      expect((err as TRPCError).code).toBe('TOO_MANY_REQUESTS')
      expect((err as TRPCError).message).toMatch(/rate limit exceeded/i)
    }
  })

  it('reports the real remaining seconds in the retry message', () => {
    const key = freshKey()
    enforceRateLimit(key, 1, 60_000)
    vi.advanceTimersByTime(20_000)
    expect(() => enforceRateLimit(key, 1, 60_000)).toThrow(/40s/)
  })

  it('keeps rejecting right up to the last millisecond of the window', () => {
    const key = freshKey()
    enforceRateLimit(key, 2, 60_000)
    enforceRateLimit(key, 2, 60_000)
    vi.advanceTimersByTime(59_999)
    expect(() => enforceRateLimit(key, 2, 60_000)).toThrow(TRPCError)
  })

  it('resets once the window has fully elapsed', () => {
    const key = freshKey()
    enforceRateLimit(key, 2, 60_000)
    enforceRateLimit(key, 2, 60_000)
    expect(() => enforceRateLimit(key, 2, 60_000)).toThrow(TRPCError)

    vi.advanceTimersByTime(60_001)
    expect(() => enforceRateLimit(key, 2, 60_000)).not.toThrow()
    expect(() => enforceRateLimit(key, 2, 60_000)).not.toThrow()
    expect(() => enforceRateLimit(key, 2, 60_000)).toThrow(TRPCError)
  })

  it('isolates buckets per key so one tenant cannot exhaust another', () => {
    // Callers key these as `gst-ai:${ctx.tenantId}` — a shared bucket would
    // let a single noisy tenant lock every other tenant out of AI features.
    const tenantA = freshKey()
    const tenantB = freshKey()

    enforceRateLimit(tenantA, 1, 60_000)
    expect(() => enforceRateLimit(tenantA, 1, 60_000)).toThrow(TRPCError)
    expect(() => enforceRateLimit(tenantB, 1, 60_000)).not.toThrow()
  })

  it('defaults to 10 calls per minute when no limit is given', () => {
    const key = freshKey()
    for (let i = 1; i <= 10; i++) {
      expect(() => enforceRateLimit(key), `default call ${i} was rejected`).not.toThrow()
    }
    expect(() => enforceRateLimit(key)).toThrow(TRPCError)
  })
})
