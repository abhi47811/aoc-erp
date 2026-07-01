import { inngest } from '../client'

// Proof-of-wiring job — no-op
export const noopJob = inngest.createFunction(
  { id: 'noop', name: 'Noop Health Check' },
  { event: 'aoc/noop' },
  async ({ event, step }) => {
    await step.run('log', () => {
      return { ok: true, receivedAt: new Date().toISOString() }
    })
  },
)
