import type { Metadata } from 'next'
import { Inter, Geist } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils"
import { Providers } from "@/lib/providers"

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AOC ERP — Addon Concepts',
  description: 'Glass & Furniture CRM/ERP for India',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
