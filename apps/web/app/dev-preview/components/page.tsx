'use client'

import React, { useState } from 'react'
import {
  Button,
  Input,
  Badge,
  StatusBadge,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  SortableHead,
  TableEmpty,
  IndianCurrencyInput,
  MeasurementInput,
} from '@aoc/ui'
import { MessageCircle, Sparkles, Download, Plus } from 'lucide-react'

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">{title}</h2>
      {children}
    </section>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>
}

// ── Toast demo state ──────────────────────────────────────────────────────────
type ToastItem = { id: string; variant: 'default' | 'success' | 'error' | 'warning' | 'info'; title: string; description?: string | undefined }

export default function ComponentsPage() {
  const [sortState, setSortState] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: '', direction: null })
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
  const [currencyValue, setCurrencyValue] = useState<number | null>(150000)
  const [measurementValue, setMeasurementValue] = useState<number | null>(1200)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  function addToast(variant: ToastItem['variant']) {
    const labels = {
      default: { title: 'Notification', description: 'Something happened.' },
      success: { title: 'Order saved', description: 'Order #AOC-1042 created successfully.' },
      error: { title: 'Save failed', description: 'Check your network and try again.' },
      warning: { title: 'Low stock', description: 'Glass sheet 6mm is running low.' },
      info: { title: 'Sync running', description: 'WhatsApp messages syncing…' },
    } satisfies Record<string, { title: string; description?: string }>
    const { title, description } = labels[variant]
    const item: ToastItem = { id: `${Date.now()}`, variant, title, description }
    setToasts((prev) => [...prev, item])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== item.id)), 4000)
  }

  function handleSort(key: string) {
    setSortState((prev) => ({
      key,
      direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc') : 'asc',
    }))
  }

  const tableRows = [
    { id: 1, name: 'Rahul Sharma', amount: 45000, status: 'paid' as const },
    { id: 2, name: 'Priya Mehta', amount: 12500, status: 'pending' as const },
    { id: 3, name: 'Amit Patel', amount: 87000, status: 'overdue' as const },
  ]

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background p-8 space-y-12 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AOC Component Showcase</h1>
          <p className="text-muted-foreground mt-1">All UI primitives in every state — dev-only page</p>
        </div>

        {/* ── Buttons ── */}
        <Section title="Button">
          <Row>
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </Row>
          <Row>
            <Button variant="whatsapp">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
            <Button variant="ai">
              <Sparkles className="h-4 w-4" /> AI Assistant
            </Button>
          </Row>
          <Row>
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon"><Download className="h-4 w-4" /></Button>
          </Row>
          <Row>
            <Button loading>Saving…</Button>
            <Button disabled>Disabled</Button>
          </Row>
        </Section>

        {/* ── Input ── */}
        <Section title="Input">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Customer name" placeholder="Rahul Sharma" />
            <Input label="GSTIN" placeholder="27AAPFU0939F1ZV" hint="15-character GST number" />
            <Input label="Mobile" prefix="+91" placeholder="9876543210" type="tel" />
            <Input label="Email" placeholder="rahul@example.com" error="Invalid email address" />
          </div>
        </Section>

        {/* ── India primitives ── */}
        <Section title="India Primitives">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <IndianCurrencyInput
              label="Order value"
              value={currencyValue}
              onChange={setCurrencyValue}
              hint="Enter amount in rupees"
            />
            <MeasurementInput
              label="Glass width"
              value={measurementValue}
              onChange={setMeasurementValue}
              allowedUnits={['mm', 'cm', 'inch']}
              hint="Enter dimension"
              maxMm={3000}
              minMm={100}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Currency: <code className="bg-muted px-1 rounded">{currencyValue}</code> mm{' '}
            · Measurement: <code className="bg-muted px-1 rounded">{measurementValue}</code> mm
          </p>
        </Section>

        {/* ── Badges ── */}
        <Section title="Badge & StatusBadge">
          <Row>
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="destructive">Error</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="outline">Outline</Badge>
          </Row>
          <Row>
            {(['draft', 'confirmed', 'in_production', 'ready', 'delivered', 'cancelled'] as const).map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </Row>
          <Row>
            {(['pending', 'partial', 'paid', 'overdue', 'refunded'] as const).map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </Row>
          <Row>
            {(['new', 'contacted', 'qualified', 'lost', 'converted'] as const).map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </Row>
        </Section>

        {/* ── Table ── */}
        <Section title="Table (sortable + selected row)">
          <Table stickyHeader>
            <table className="w-full caption-bottom text-sm">
              <TableHeader>
                <TableRow>
                  <SortableHead sortKey="name" currentSort={sortState} onSort={handleSort}>Customer</SortableHead>
                  <SortableHead sortKey="amount" currentSort={sortState} onSort={handleSort}>Amount</SortableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.length === 0 ? (
                  <TableEmpty colSpan={3} />
                ) : (
                  tableRows.map((row) => (
                    <TableRow
                      key={row.id}
                      selected={selectedRow === row.id}
                      onClick={() => setSelectedRow(selectedRow === row.id ? null : row.id)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>₹{row.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell><StatusBadge status={row.status} /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </table>
          </Table>
          <p className="text-xs text-muted-foreground">Click a row to select. Click column headers to sort.</p>
        </Section>

        {/* ── Dialog ── */}
        <Section title="Dialog (size variants + sticky footer)">
          <Row>
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <Dialog key={size}>
                <DialogTrigger asChild>
                  <Button variant="outline">{size.toUpperCase()} Dialog</Button>
                </DialogTrigger>
                <DialogContent size={size}>
                  <DialogHeader>
                    <DialogTitle>Create Order</DialogTitle>
                    <DialogDescription>Fill in the order details below.</DialogDescription>
                  </DialogHeader>
                  <DialogBody>
                    <div className="space-y-4">
                      <Input label="Customer name" placeholder="Rahul Sharma" />
                      <IndianCurrencyInput label="Order amount" value={50000} onChange={() => {}} />
                    </div>
                  </DialogBody>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button><Plus className="h-4 w-4" /> Create Order</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ))}
          </Row>
        </Section>

        {/* ── Sheet ── */}
        <Section title="Sheet (bottom mobile / right desktop)">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open Sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Quick Add Enquiry</SheetTitle>
              </SheetHeader>
              <SheetBody>
                <div className="space-y-4">
                  <Input label="Customer name" placeholder="Rahul Sharma" />
                  <Input label="Mobile" prefix="+91" placeholder="9876543210" />
                  <MeasurementInput label="Width" value={600} onChange={() => {}} />
                  <MeasurementInput label="Height" value={900} onChange={() => {}} />
                </div>
              </SheetBody>
              <SheetFooter>
                <Button variant="ghost" className="mr-auto">Clear</Button>
                <Button>Save Enquiry</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </Section>

        {/* ── Toast ── */}
        <Section title="Toast (all variants)">
          <Row>
            {(['default', 'success', 'error', 'warning', 'info'] as const).map((v) => (
              <Button key={v} variant="outline" onClick={() => addToast(v)}>
                {v} toast
              </Button>
            ))}
          </Row>
        </Section>

        {toasts.map((t) => (
          <Toast key={t.id} variant={t.variant} open>
            <ToastTitle>{t.title}</ToastTitle>
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
            <ToastAction altText="Dismiss">Dismiss</ToastAction>
            <ToastClose />
          </Toast>
        ))}
      </div>

      <ToastViewport />
    </ToastProvider>
  )
}
