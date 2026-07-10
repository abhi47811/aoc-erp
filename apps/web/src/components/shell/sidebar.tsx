'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, Package, Factory,
  Truck, BarChart3, Settings, ChevronLeft, ChevronRight,
  Briefcase, ShoppingCart, Wrench, CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  section?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'OVERVIEW' },
  { label: 'Leads', href: '/leads', icon: Users, section: 'CRM' },
  { label: 'Clients', href: '/clients', icon: Briefcase, section: 'CRM' },
  { label: 'Projects', href: '/projects', icon: Wrench, section: 'CRM' },
  { label: 'Quotations', href: '/quotations', icon: FileText, section: 'SALES' },
  { label: 'Sales Orders', href: '/orders', icon: ShoppingCart, section: 'SALES' },
  { label: 'Invoices', href: '/invoices', icon: CreditCard, section: 'SALES' },
  { label: 'Production', href: '/production', icon: Factory, section: 'OPERATIONS' },
  { label: 'Inventory', href: '/inventory', icon: Package, section: 'OPERATIONS' },
  { label: 'Dispatch', href: '/dispatch', icon: Truck, section: 'OPERATIONS' },
  { label: 'Reports', href: '/reports', icon: BarChart3, section: 'ANALYTICS' },
  { label: 'Settings', href: '/settings', icon: Settings, section: 'SYSTEM' },
]

const SECTIONS = ['OVERVIEW', 'CRM', 'SALES', 'OPERATIONS', 'ANALYTICS', 'SYSTEM']

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('aoc-sidebar-collapsed')
    if (stored) setCollapsed(stored === 'true')
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem('aoc-sidebar-collapsed', String(!prev))
      return !prev
    })
  }

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        'group flex flex-col h-full bg-[#0a0e1a] border-r border-[hsl(var(--sidebar-border))]',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-[hsl(var(--sidebar-border))]">
        {!collapsed && (
          <span className="text-white font-bold text-lg tracking-tight">AOC ERP</span>
        )}
        {collapsed && (
          <span className="text-white font-bold text-lg mx-auto">A</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {SECTIONS.map((section) => {
          const items = NAV_ITEMS.filter((i) => i.section === section)
          if (!items.length) return null
          return (
            <div key={section} className="mb-3">
              {!collapsed && (
                <p className="px-2 mb-1 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
                  {section}
                </p>
              )}
              {items.map((item) => {
                const active = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href as Route}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium',
                      'transition-colors duration-100',
                      active
                        ? 'bg-zinc-800 text-white border-l-2 border-[hsl(var(--primary))] pl-[calc(0.5rem-2px)]'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white',
                      collapsed && 'justify-center',
                    )}
                  >
                    <item.icon className="shrink-0 w-4 h-4" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        className="flex items-center justify-center h-10 border-t border-[hsl(var(--sidebar-border))] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  )
}
