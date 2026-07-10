'use client'

import { Command } from 'cmdk'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building2,
  Truck,
  Compass,
  FolderKanban,
  Package,
  PenTool,
  ShoppingCart,
  Receipt,
  Wrench,
  Calculator,
  Settings,
  MessageCircle,
  BarChart3,
  Shield,
  ClipboardList,
  Kanban,
  CheckSquare,
  UserPlus,
  FileText,
  FilePlus,
  ClipboardPlus,
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard',     href: '/dashboard',     icon: LayoutDashboard },
  { label: 'Leads',         href: '/leads',          icon: Users },
  { label: 'Clients',       href: '/clients',        icon: Building2 },
  { label: 'Architects',    href: '/architects',     icon: Compass },
  { label: 'Suppliers',     href: '/suppliers',      icon: Truck },
  { label: 'Projects',      href: '/projects',       icon: FolderKanban },
  { label: 'Inventory',     href: '/inventory',      icon: Package },
  { label: 'Drawings',      href: '/drawings',       icon: PenTool },
  { label: 'Purchase',      href: '/purchase',       icon: ShoppingCart },
  { label: 'Sales',         href: '/sales',          icon: Receipt },
  { label: 'Work Orders',   href: '/work-orders',    icon: ClipboardList },
  { label: 'Production',    href: '/production',     icon: Kanban },
  { label: 'QC / Delivery', href: '/work-orders',   icon: CheckSquare },
  { label: 'Operations',    href: '/operations',     icon: Wrench },
  { label: 'Accounting',    href: '/accounting',     icon: Calculator },
  { label: 'Communication', href: '/communications', icon: MessageCircle },
  { label: 'Reports',       href: '/reports',        icon: BarChart3 },
  { label: 'Management',    href: '/management',     icon: Shield },
  { label: 'Settings',      href: '/settings',       icon: Settings },
] as const

const QUICK_ACTIONS = [
  { label: 'New Lead',       href: '/leads',          icon: UserPlus },
  { label: 'New Quotation',  href: '/quotations/new', icon: FileText },
  { label: 'New Invoice',    href: '/invoices',       icon: FilePlus },
  { label: 'New Work Order', href: '/work-orders',    icon: ClipboardPlus },
] as const

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!open) return null

  function go(href: string) {
    router.push(href as Parameters<typeof router.push>[0])
    setOpen(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <Command
        className="bg-white rounded-2xl border border-slate-200 shadow-lg w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command.Input
          autoFocus
          placeholder="Search modules, or jump to a page..."
          className="w-full px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 border-b border-slate-100 focus:outline-none"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-4 py-6 text-sm text-slate-400 text-center">
            No results found.
          </Command.Empty>

          <Command.Group heading="Quick Actions" className="text-xs text-slate-400 px-2 py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
              <Command.Item
                key={'quick-' + href + label}
                value={label}
                onSelect={() => go(href)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-700 cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 transition-colors"
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Navigation" className="text-xs text-slate-400 px-2 py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            {NAV.map(({ label, href, icon: Icon }) => (
              <Command.Item
                key={href + label}
                value={label}
                onSelect={() => go(href)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-700 cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 transition-colors"
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>

        <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-400">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </Command>
    </div>
  )
}
