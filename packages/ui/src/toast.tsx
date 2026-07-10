'use client'

import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './lib/utils'

const ToastProvider = ToastPrimitive.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]',
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitive.Viewport.displayName

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        success: 'border-green-200 bg-green-50 text-green-900',
        error: 'border-red-200 bg-red-50 text-red-900',
        warning: 'border-amber-200 bg-amber-50 text-amber-900',
        info: 'border-blue-200 bg-blue-50 text-blue-900',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

const TOAST_ICONS = {
  default: null,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const

type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

interface ToastProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>,
    VariantProps<typeof toastVariants> {}

const Toast = React.forwardRef<React.ElementRef<typeof ToastPrimitive.Root>, ToastProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const Icon = TOAST_ICONS[variant ?? 'default']
    return (
      <ToastPrimitive.Root
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        {Icon && (
          <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
        )}
        <div className="flex-1 min-w-0">{props.children}</div>
      </ToastPrimitive.Root>
    )
  }
)
Toast.displayName = ToastPrimitive.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50',
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitive.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn('shrink-0 opacity-50 hover:opacity-100 transition-opacity', className)}
    {...props}
  >
    <X className="h-4 w-4" />
    <span className="sr-only">Close</span>
  </ToastPrimitive.Close>
))
ToastClose.displayName = ToastPrimitive.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={cn('text-sm font-semibold', className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitive.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn('text-sm opacity-80', className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitive.Description.displayName

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
export type { ToastVariant }
