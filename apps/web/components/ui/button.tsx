import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'
type Size = 'sm' | 'md'

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0',
  secondary:
    'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
  danger:
    'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

/**
 * Shared button primitive. Existing per-page inline className strings for
 * these three variants were copy-pasted near-identically ~40+ times across
 * the app; this is the single source of truth going forward. Not yet wired
 * into every existing call site -- see the design-system migration.
 */
export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} rounded-lg font-medium transition-all duration-150 ease-out-smooth ${className}`}
    />
  )
}
