import { serve } from 'inngest/next'
import { inngest, noopJob } from '@aoc/inngest'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [noopJob],
})
