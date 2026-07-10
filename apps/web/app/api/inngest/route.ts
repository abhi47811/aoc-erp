import { serve } from 'inngest/next'
import { inngest, noopJob, provisionTenant } from '@aoc/inngest'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [noopJob, provisionTenant],
})
