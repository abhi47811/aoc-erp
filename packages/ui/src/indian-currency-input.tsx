'use client'

import * as React from 'react'
import { Input, type InputProps } from './input'

// Format a numeric value as Indian number system (lakhs/crores)
function formatIndianDisplay(value: number): string {
  if (isNaN(value)) return ''
  // Use Indian locale for number formatting
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value)
}

// Parse user input back to a number, handling Indian formatting
function parseIndianInput(raw: string): number {
  // Remove currency symbol, commas, spaces
  const cleaned = raw.replace(/[₹,\s]/g, '')
  return parseFloat(cleaned)
}

// Human-readable label: 1,50,000 → "1.5 Lakh", 1,00,00,000 → "1 Crore"
function humanizeAmount(value: number): string {
  if (value >= 1_00_00_000) {
    return `${(value / 1_00_00_000).toFixed(2).replace(/\.?0+$/, '')} Cr`
  }
  if (value >= 1_00_000) {
    return `${(value / 1_00_000).toFixed(2).replace(/\.?0+$/, '')} L`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.?0+$/, '')}K`
  }
  return ''
}

export interface IndianCurrencyInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  value?: number | null
  onChange?: (value: number | null) => void
  showHumanize?: boolean
}

function IndianCurrencyInput({
  value,
  onChange,
  showHumanize = true,
  hint,
  ...props
}: IndianCurrencyInputProps) {
  const [displayValue, setDisplayValue] = React.useState<string>(
    value != null ? formatIndianDisplay(value) : ''
  )
  const [isFocused, setIsFocused] = React.useState(false)

  // Sync external value changes
  React.useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value != null ? formatIndianDisplay(value) : '')
    }
  }, [value, isFocused])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setDisplayValue(raw)
    const parsed = parseIndianInput(raw)
    onChange?.(isNaN(parsed) ? null : parsed)
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setIsFocused(false)
    const parsed = parseIndianInput(e.target.value)
    if (!isNaN(parsed)) {
      setDisplayValue(formatIndianDisplay(parsed))
    } else {
      setDisplayValue('')
    }
    props.onBlur?.(e)
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setIsFocused(true)
    // On focus, show raw numeric value for easy editing
    if (value != null && !isNaN(value)) {
      setDisplayValue(String(value))
    }
    props.onFocus?.(e)
  }

  const numericValue = value ?? 0
  const humanLabel = showHumanize && numericValue > 0 ? humanizeAmount(numericValue) : ''
  const hintText = humanLabel ? `≈ ${humanLabel}${hint ? ` · ${hint}` : ''}` : hint

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      prefix="₹"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      {...(hintText !== undefined ? { hint: hintText } : {})}
      placeholder={props.placeholder ?? '0'}
    />
  )
}

export { IndianCurrencyInput, formatIndianDisplay, humanizeAmount }
