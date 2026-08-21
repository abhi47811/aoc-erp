'use client'

import { Bell, LogOut, Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/app/(auth)/login/actions'
import { Tooltip } from '@/components/ui/tooltip'
import { CommandPalette } from '@/components/command-palette'
import { AiChatPanel, openAiChat } from '@/components/ai-chat-panel'

interface TopbarProps {
  breadcrumbs?: { label: string; href?: string }[]
}

export function Topbar({ breadcrumbs }: TopbarProps) {
  return (
    <header className="h-14 flex items-center gap-4 px-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-md shadow-elevation-xs shrink-0 sticky top-0 z-30">
      {/* Breadcrumbs */}
      <div className="flex-1 flex items-center gap-1.5 text-sm">
        {breadcrumbs?.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300">/</span>}
            <span className={cn(
              i === (breadcrumbs.length - 1)
                ? 'text-slate-900 font-semibold tracking-tight'
                : 'text-slate-500'
            )}>
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      {/* Cmd+K search */}
      <button
        aria-label="Open command palette"
        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-white hover:shadow-elevation-xs transition-all duration-150 ease-out-smooth min-w-[180px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Search size={14} aria-hidden="true" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-[10px] font-medium bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded shadow-elevation-xs">⌘K</kbd>
      </button>
      <CommandPalette />

      {/* AI button */}
      <button
        onClick={openAiChat}
        aria-label="Ask AI"
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-lg shadow-sm shadow-purple-500/25 hover:shadow-md hover:shadow-purple-500/30 transition-all duration-150 ease-out-smooth hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
      >
        <Sparkles size={14} aria-hidden="true" />
        <span className="hidden sm:inline">Ask AI</span>
      </button>
      <AiChatPanel />

      {/* Notifications */}
      <Tooltip content="Notifications">
        <button
          aria-label="Notifications"
          className="relative p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Bell size={18} aria-hidden="true" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white" aria-hidden="true" />
        </button>
      </Tooltip>

      {/* Avatar + logout */}
      <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shadow-elevation-xs ml-2" aria-hidden="true">
          A
        </div>
        <form action={logout}>
          <Tooltip content="Sign out">
            <button
              type="submit"
              aria-label="Sign out"
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </Tooltip>
        </form>
      </div>
    </header>
  )
}
