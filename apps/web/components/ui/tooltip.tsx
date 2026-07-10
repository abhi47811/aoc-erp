'use client'

import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Side = 'top' | 'bottom' | 'left' | 'right'

const SIDE_CLASSES: Record<Side, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: Side
  className?: string
}

/**
 * Lightweight, dependency-free tooltip. Shows on hover AND keyboard focus
 * (not hover-only, per WCAG 2.1.1) and respects prefers-reduced-motion.
 */
export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const id = useId()

  if (!content) return <>{children}</>

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined} className="inline-flex">
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-md transition-opacity duration-150 motion-reduce:transition-none',
          visible ? 'opacity-100' : 'opacity-0',
          SIDE_CLASSES[side],
          className
        )}
      >
        {content}
      </span>
    </span>
  )
}
