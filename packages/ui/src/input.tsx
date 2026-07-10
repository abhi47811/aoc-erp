'use client'

import * as React from 'react'
import { cn } from './lib/utils'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'> {
  prefix?: React.ReactNode | undefined
  suffix?: React.ReactNode | undefined
  hint?: string | undefined
  error?: string | undefined
  label?: string | undefined
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, prefix, suffix, hint, error, label, id, ...props }, ref) => {
    const inputId = id ?? React.useId()
    const hintId = hint ? `${inputId}-hint` : undefined
    const errorId = error ? `${inputId}-error` : undefined

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div
          className={cn(
            'flex items-center rounded-md border bg-background text-sm ring-offset-background',
            'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
            error
              ? 'border-destructive focus-within:ring-destructive/30'
              : 'border-input',
            props.disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {prefix && (
            <span className="flex items-center pl-3 pr-2 text-muted-foreground select-none shrink-0">
              {prefix}
            </span>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            aria-describedby={cn(hintId, errorId) || undefined}
            aria-invalid={!!error}
            className={cn(
              'flex-1 bg-transparent py-2 px-3 placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed',
              prefix && 'pl-0',
              suffix && 'pr-0',
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="flex items-center pr-3 pl-2 text-muted-foreground select-none shrink-0">
              {suffix}
            </span>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-xs text-destructive">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
