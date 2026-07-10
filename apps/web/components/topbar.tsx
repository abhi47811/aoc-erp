'use client'

import { Bell, LogOut, Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/app/(auth)/login/actions'

interface TopbarProps {
  breadcrumbs?: { label: string; href?: string }[]
}

export function Topbar({ breadcrumbs }: TopbarProps) {
  return (
    <header className="h-14 flex items-center gap-4 px-4 border-b border-border bg-background shrink-0">
      {/* Breadcrumbs */}
      <div className="flex-1 flex items-center gap-1 text-sm">
        {breadcrumbs?.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground">/</span>}
            <span className={cn(
              i === (breadcrumbs.length - 1)
                ? 'text-foreground font-medium'
                : 'text-muted-foreground'
            )}>
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      {/* Cmd+K search */}
      <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-md hover:border-slate-300 transition-colors min-w-[180px]">
        <Search size={14} />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-xs bg-muted px-1 rounded">⌘K</kbd>
      </button>

      {/* AI button */}
      <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors">
        <Sparkles size={14} />
        <span className="hidden sm:inline">Ask AI</span>
      </button>

      {/* Notifications */}
      <button className="relative p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
      </button>

      {/* Avatar + logout */}
      <div className="flex items-center gap-1">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
          A
        </div>
        <form action={logout}>
          <button
            type="submit"
            title="Sign out"
            className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  )
}
