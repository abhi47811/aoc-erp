'use client'

import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, Send } from 'lucide-react'
import { trpc } from '@/lib/trpc'

type Message = { role: 'user' | 'assistant'; content: string }

const OPEN_EVENT = 'open-ai-chat'

const SUGGESTIONS = [
  'How many open leads do we have?',
  'Which quotations are still in draft?',
  'What inventory is low on stock?',
  'How many work orders are pending QC?',
]

export function AiChatPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const chat = trpc.copilot.chat.useMutation({
    onSuccess: (data) => setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]),
    onError: (err) => setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, something went wrong: ${err.message}` }]),
  })

  useEffect(() => {
    const handler = () => setOpen(true)
    document.addEventListener(OPEN_EVENT, handler)
    return () => document.removeEventListener(OPEN_EVENT, handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, chat.isPending])

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || chat.isPending) return
    const next = [...messages, { role: 'user' as const, content: trimmed }]
    setMessages(next)
    setInput('')
    chat.mutate({ messages: next })
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI copilot"
        className="fixed top-0 right-0 h-screen w-full sm:w-[420px] bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-600" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900">Ask AI</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close AI copilot"
            className="p-1.5 text-slate-500 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Messages */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Ask about leads, quotations, invoices, work orders, inventory, or QC — I read live data, I can&apos;t create or edit anything.
              </p>
              <div className="space-y-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-sm text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {chat.isPending && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce motion-reduce:animate-none"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input) }}
          className="shrink-0 border-t border-slate-100 p-3 flex items-center gap-2"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question about your data..."
            aria-label="Message"
            className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={chat.isPending || !input.trim()}
            aria-label="Send message"
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Send size={16} aria-hidden="true" />
          </button>
        </form>
      </div>
    </>
  )
}

export function openAiChat() {
  document.dispatchEvent(new CustomEvent(OPEN_EVENT))
}
