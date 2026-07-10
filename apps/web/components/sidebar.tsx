'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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
  PackageCheck,
  Wrench,
  Calculator,
  Settings,
  MessageCircle,
  BarChart3,
  Shield,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Kanban,
  CheckSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-zinc-950 border-r border-zinc-800 transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 px-4 border-b border-zinc-800',
        collapsed ? 'justify-center' : 'gap-2'
      )}>
        <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">A</span>
        </div>
        {!collapsed && (
          <span className="text-white font-semibold text-sm truncate">AOC ERP</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-none">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 mx-2 rounded-md transition-colors duration-100',
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
                active
                  ? 'bg-zinc-800 text-white border-l-2 border-blue-500 rounded-l-none'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="text-sm truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-center h-10 border-t border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  )
}
