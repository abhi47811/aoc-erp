'use client'

import { Bell, Sparkles, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopbarProps {
  tenantName?: string | undefined
  userName?: string | undefined
  userInitials?: string | undefined
}

export function Topbar({ tenantName = 'AOC', userName, userInitials = 'U' }: TopbarProps) {
  return (
    <header className="flex items-center h-14 px-4 gap-3 bg-white border-b border-border shrink-0">
      {/* Tenant chip */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-sm font-medium text-foreground">
        <span className="w-2 h-2 rounded-full bg-success" />
        {tenantName}
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </div>

      {/* Cmd+K placeholder */}
      <button
        className="hidden md:flex items-center gap-2 flex-1 max-w-xs px-3 py-1.5 text-sm text-muted-foreground bg-muted rounded-md border border-border hover:border-ring transition-colors"
        aria-label="Open command palette"
      >
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-[10px] font-mono bg-background border border-border rounded px-1">⌘K</kbd>
      </button>

      <div className="flex-1" />

      {/* AI button */}
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--ai))] text-white text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
        aria-label="Open AI assistant"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">AI</span>
      </button>

      {/* Notifications */}
      <button
        className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-danger" />
      </button>

      {/* User avatar */}
      <button
        className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
        aria-label={`User: ${userName}`}
      >
        {userInitials}
      </button>
    </header>
  )
}
