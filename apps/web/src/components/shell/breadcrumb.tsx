import Link from 'next/link'
import type { Route } from 'next'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Crumb {
  label: string
  href?: string
}

interface BreadcrumbProps {
  crumbs: Crumb[]
  className?: string
}

export function Breadcrumb({ crumbs, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-sm', className)}>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          {crumb.href && i < crumbs.length - 1 ? (
            <Link href={crumb.href as Route} className="text-muted-foreground hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className={cn(i === crumbs.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground')}>
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
