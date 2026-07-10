'use client'

import * as React from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from './lib/utils'

interface TableProps extends React.HTMLAttributes<HTMLDivElement> {
  stickyHeader?: boolean | undefined
}

function Table({ className, stickyHeader = false, ...props }: TableProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-auto rounded-md border border-border',
        stickyHeader && 'max-h-[600px]',
        className
      )}
      {...props}
    />
  )
}

function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('[&_tr]:border-b sticky top-0 z-10 bg-muted/80 backdrop-blur-sm', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

function TableRow({ className, selected, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return (
    <tr
      className={cn(
        'border-b border-border transition-colors hover:bg-muted/40',
        selected && 'bg-primary/5 hover:bg-primary/10',
        className
      )}
      aria-selected={selected}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-10 px-4 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide',
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3 align-middle text-sm', className)} {...props} />
  )
}

type SortDirection = 'asc' | 'desc' | null

interface SortableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortKey: string
  currentSort?: { key: string; direction: SortDirection }
  onSort?: (key: string) => void
}

function SortableHead({ sortKey, currentSort, onSort, children, className, ...props }: SortableHeadProps) {
  const isActive = currentSort?.key === sortKey
  const direction = isActive ? currentSort?.direction : null

  return (
    <th
      className={cn(
        'h-10 px-4 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide',
        'cursor-pointer select-none hover:text-foreground transition-colors',
        isActive && 'text-foreground',
        className
      )}
      onClick={() => onSort?.(sortKey)}
      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
      {...props}
    >
      <span className="flex items-center gap-1">
        {children}
        {direction === 'asc' ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : direction === 'desc' ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </span>
    </th>
  )
}

function TableEmpty({ colSpan, children }: { colSpan: number; children?: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-sm text-muted-foreground">
        {children ?? 'No records found'}
      </td>
    </tr>
  )
}

// Convenience wrapper — renders a real <table> inside the Table div
interface DataTableProps extends TableProps {
  header?: React.ReactNode
  body?: React.ReactNode
}

function DataTable({ stickyHeader, header, body, className, ...props }: DataTableProps) {
  return (
    <Table stickyHeader={stickyHeader} className={className} {...props}>
      <table className="w-full caption-bottom text-sm">
        {header && <TableHeader>{header}</TableHeader>}
        {body && <TableBody>{body}</TableBody>}
      </table>
    </Table>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  SortableHead,
  TableEmpty,
  DataTable,
}
export type { SortDirection }
