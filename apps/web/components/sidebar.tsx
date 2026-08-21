'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Building2, Truck, Compass,
  FolderKanban, Package, PenTool, ShoppingCart, Receipt,
  Wrench, Calculator, Settings, MessageCircle, BarChart3,
  Shield, ChevronLeft, ChevronRight, ClipboardList, Kanban, CheckSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/tooltip'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',   href: '/dashboard',     icon: LayoutDashboard },
    ],
  },
  {
    label: 'CRM',
    items: [
      { label: 'Leads',       href: '/leads',          icon: Users },
      { label: 'Clients',     href: '/clients',        icon: Building2 },
      { label: 'Architects',  href: '/architects',     icon: Compass },
      { label: 'Suppliers',   href: '/suppliers',      icon: Truck },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Projects',    href: '/projects',       icon: FolderKanban },
      { label: 'Inventory',   href: '/inventory',      icon: Package },
      { label: 'Drawings',    href: '/drawings',       icon: PenTool },
      { label: 'Purchase',    href: '/purchase',       icon: ShoppingCart },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Sales',       href: '/sales',          icon: Receipt },
      { label: 'Work Orders', href: '/work-orders',    icon: ClipboardList },
    ],
  },
  {
    label: 'Production',
    items: [
      { label: 'Production',    href: '/production',     icon: Kanban },
      { label: 'QC / Delivery', href: '/work-orders',   icon: CheckSquare },
      { label: 'Operations',    href: '/operations',     icon: Wrench },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Accounting',  href: '/accounting',     icon: Calculator },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Communication', href: '/communications', icon: MessageCircle },
      { label: 'Reports',       href: '/reports',        icon: BarChart3 },
      { label: 'Management',    href: '/management',     icon: Shield },
      { label: 'Settings',      href: '/settings',       icon: Settings },
    ],
  },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 transition-all duration-200 shrink-0',
        collapsed ? 'w-[60px]' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 px-4 border-b border-white/[0.06]',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0 shadow-glow-blue">
          <span className="text-white text-xs font-bold tracking-tight">A</span>
        </div>
        {!collapsed && (
          <div className="min-w-0 animate-fade-in-up">
            <span className="text-white font-semibold text-sm tracking-tight truncate block">AOC ERP</span>
            <span className="text-slate-500 text-[10px] truncate block">Glass Works</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-none">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
                const link = (
                  <Link
                    href={href}
                    aria-label={label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-md text-sm ease-out-smooth transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                      collapsed ? 'justify-center p-2.5' : 'px-2.5 py-2',
                      active
                        ? 'bg-gradient-to-r from-blue-500/15 to-blue-500/5 text-blue-300 font-medium shadow-[inset_0_0_0_1px_rgba(96,165,250,0.12)]'
                        : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 hover:translate-x-0.5'
                    )}
                  >
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-blue-400 shadow-glow-blue"
                        aria-hidden="true"
                      />
                    )}
                    <Icon
                      size={15}
                      aria-hidden="true"
                      className={cn(
                        'shrink-0 transition-transform duration-150 ease-out-smooth',
                        active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                      )}
                    />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                )
                return (
                  <div key={href + label}>
                    {collapsed ? <Tooltip content={label} side="right">{link}</Tooltip> : link}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex w-full items-center justify-center h-10 border-t border-white/[0.06] text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
        >
          {collapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
        </button>
      </Tooltip>
    </aside>
  )
}
