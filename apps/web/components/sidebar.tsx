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
        'relative flex flex-col h-screen bg-white border-r border-slate-200 transition-all duration-200 shrink-0',
        collapsed ? 'w-[60px]' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 px-4 border-b border-slate-200',
        collapsed ? 'justify-center' : 'gap-2.5'
      )}>
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold tracking-tight">A</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="text-slate-900 font-semibold text-sm truncate block">AOC ERP</span>
            <span className="text-slate-400 text-[10px] truncate block">Glass Works</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-none">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href + label}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-md transition-colors duration-100 text-sm',
                collapsed ? 'justify-center p-2.5' : 'px-2.5 py-2',
                active
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon
                size={16}
                className={cn('shrink-0', active ? 'text-blue-600' : 'text-slate-400')}
              />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-center h-10 border-t border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
    </aside>
  )
}
