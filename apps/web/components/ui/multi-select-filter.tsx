'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface MultiSelectFilterProps {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (values: string[]) => void
}

export function MultiSelectFilter({ label, options, selected, onChange }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  function toggle(value: string) {
    onChange(
      selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]
    )
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
          selected.length > 0
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        {selected.length > 0 ? `${label} (${selected.length})` : label}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute bg-white rounded-xl border border-slate-200 shadow-lg z-20 mt-2 min-w-[200px] max-h-72 overflow-y-auto p-2">
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <button
              type="button"
              onClick={() => onChange(options.map(o => o.value))}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Clear
            </button>
          </div>
          {options.map(option => {
            const id = `multi-select-${label}-${option.value}`.replace(/\s+/g, '-')
            return (
              <label
                key={option.value}
                htmlFor={id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => toggle(option.value)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {option.label}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
