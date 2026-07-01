import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@aoc/ui', '@aoc/db', '@aoc/validators', '@aoc/ai', '@aoc/inngest'],
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

export default nextConfig
