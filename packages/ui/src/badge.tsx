import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive/10 text-destructive',
        outline: 'border border-border text-foreground',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-amber-100 text-amber-800',
        info: 'bg-blue-100 text-blue-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

// AOC-specific status types from the spec
type OrderStatus = 'draft' | 'confirmed' | 'in_production' | 'ready' | 'delivered' | 'cancelled'
type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'refunded'
type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost' | 'converted'

type AocStatus = OrderStatus | PaymentStatus | LeadStatus

const STATUS_CONFIG: Record<AocStatus, { label: string; variant: BadgeProps['variant'] }> = {
  // Order
  draft: { label: 'Draft', variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'info' },
  in_production: { label: 'In Production', variant: 'warning' },
  ready: { label: 'Ready', variant: 'success' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  // Payment
  pending: { label: 'Pending', variant: 'warning' },
  partial: { label: 'Partial', variant: 'warning' },
  paid: { label: 'Paid', variant: 'success' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  refunded: { label: 'Refunded', variant: 'secondary' },
  // Lead
  new: { label: 'New', variant: 'info' },
  contacted: { label: 'Contacted', variant: 'info' },
  qualified: { label: 'Qualified', variant: 'success' },
  lost: { label: 'Lost', variant: 'destructive' },
  converted: { label: 'Converted', variant: 'success' },
}

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: AocStatus
}

function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'secondary' as const }
  return (
    <Badge variant={config.variant} className={cn('capitalize', className)} {...props}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {config.label}
    </Badge>
  )
}

export { Badge, StatusBadge, badgeVariants }
export type { AocStatus, OrderStatus, PaymentStatus, LeadStatus }
