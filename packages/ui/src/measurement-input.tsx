'use client'

import * as React from 'react'
import { Input, type InputProps } from './input'

type Unit = 'mm' | 'cm' | 'inch' | 'ft'

const UNIT_TO_MM: Record<Unit, number> = {
  mm: 1,
  cm: 10,
  inch: 25.4,
  ft: 304.8,
}

function convertToMm(value: number, from: Unit): number {
  return value * UNIT_TO_MM[from]
}

function convertFromMm(valueMm: number, to: Unit): number {
  return valueMm / UNIT_TO_MM[to]
}

function formatMeasurement(value: number, unit: Unit): string {
  const precision = unit === 'mm' ? 0 : unit === 'cm' ? 1 : 2
  return value.toFixed(precision)
}

export interface MeasurementInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type' | 'suffix'> {
  value?: number | null  // always stored in mm internally
  onChange?: (valueMm: number | null) => void
  defaultUnit?: Unit
  allowedUnits?: Unit[]
  maxMm?: number
  minMm?: number
}

const DEFAULT_UNITS: Unit[] = ['mm', 'cm', 'inch']

function MeasurementInput({
  value,
  onChange,
  defaultUnit = 'mm',
  allowedUnits = DEFAULT_UNITS,
  maxMm,
  minMm,
  hint,
  ...props
}: MeasurementInputProps) {
  const [unit, setUnit] = React.useState<Unit>(defaultUnit)
  const [displayValue, setDisplayValue] = React.useState<string>(
    value != null ? formatMeasurement(convertFromMm(value, defaultUnit), defaultUnit) : ''
  )

  React.useEffect(() => {
    if (value != null) {
      setDisplayValue(formatMeasurement(convertFromMm(value, unit), unit))
    } else {
      setDisplayValue('')
    }
  }, [value, unit])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setDisplayValue(raw)
    const parsed = parseFloat(raw)
    if (!isNaN(parsed)) {
      const mm = convertToMm(parsed, unit)
      onChange?.(mm)
    } else {
      onChange?.(null)
    }
  }

  function handleUnitChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newUnit = e.target.value as Unit
    // Convert current display value to new unit
    const currentMm = value ?? 0
    setDisplayValue(formatMeasurement(convertFromMm(currentMm, newUnit), newUnit))
    setUnit(newUnit)
  }

  // Validate range
  const numMm = value ?? 0
  const rangeError =
    (minMm != null && numMm < minMm && numMm > 0)
      ? `Min ${formatMeasurement(convertFromMm(minMm, unit), unit)} ${unit}`
      : (maxMm != null && numMm > maxMm)
      ? `Max ${formatMeasurement(convertFromMm(maxMm, unit), unit)} ${unit}`
      : undefined

  // Conversion hint: if not in mm, show mm equivalent
  const conversionHint =
    unit !== 'mm' && value != null && value > 0
      ? `= ${Math.round(value)} mm`
      : undefined
  const hintText = conversionHint ?? hint

  const unitSelector = (
    <select
      value={unit}
      onChange={handleUnitChange}
      className="bg-transparent text-muted-foreground text-xs border-l border-border pl-2 pr-1 focus:outline-none cursor-pointer"
      aria-label="Unit"
    >
      {allowedUnits.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  )

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      suffix={unitSelector}
      {...(hintText !== undefined ? { hint: hintText } : {})}
      {...(rangeError !== undefined ? { error: rangeError } : {})}
      placeholder={props.placeholder ?? '0'}
    />
  )
}

export { MeasurementInput, convertToMm, convertFromMm }
export type { Unit }
