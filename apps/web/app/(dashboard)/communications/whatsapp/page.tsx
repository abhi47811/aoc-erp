'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'

const TEMPLATES = [
  { id: 'quotation', label: 'Quotation Ready', fields: ['Contact Name', 'Quotation No.', 'Amount (₹)'] },
  { id: 'delivery', label: 'Delivery Update', fields: ['Contact Name', 'Order Ref.', 'Delivery Date'] },
  { id: 'custom', label: 'Custom Message', fields: [] },
]

function buildMessage(templateId: string, vals: string[], custom: string) {
  if (templateId === 'quotation') {
    const [name, ref, amount] = vals
    return `Hi ${name || 'there'},\n\nYour quotation *${ref || 'REF'}* for ₹${amount || '0'} is ready for review.\n\nPlease contact us to confirm your order.\n\n– AOC Glass`
  }
  if (templateId === 'delivery') {
    const [name, ref, date] = vals
    return `Hi ${name || 'there'},\n\nYour order *${ref || 'REF'}* is scheduled for delivery on *${date || 'TBD'}*.\n\nWe'll send another update when it's out for delivery.\n\n– AOC Glass`
  }
  return custom
}

export default function WhatsAppPage() {
  const [phone, setPhone] = useState('')
  const [templateId, setTemplateId] = useState('custom')
  const [vals, setVals] = useState(['', '', ''])
  const [custom, setCustom] = useState('')

  const { data: messages, isLoading: mLoading } = trpc.whatsapp.listMessages.useQuery({ limit: 50 })
  const msgList = (messages ?? []) as any[]

  const template = TEMPLATES.find(t => t.id === templateId)!
  const message = buildMessage(templateId, vals, custom)
  const digits = phone.replace(/\D/g, '')
  const waUrl = digits.length >= 10
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : null

  const directionColor = (dir: string) => dir === 'inbound' ? 'text-green-400' : 'text-blue-400'
  const statusColor = (s: string) => ({ sent: 'text-zinc-400', delivered: 'text-green-400', failed: 'text-red-400', read: 'text-blue-400' })[s] ?? 'text-zinc-400'

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">WhatsApp</h1>
          <p className="text-sm text-zinc-400 mt-1">Send messages via WhatsApp Web</p>
        </div>
        <a href="/communications" className="text-zinc-400 hover:text-zinc-200 text-sm">← Communications</a>
      </div>

      {/* Compose */}
      <div className="bg-zinc-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-700">
          <h3 className="text-sm font-semibold text-zinc-200">Compose Message</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Phone */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Phone Number (with country code)</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="919876543210"
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:outline-none focus:border-green-500"
            />
            <p className="text-xs text-zinc-500 mt-1">Include country code, no + or spaces (e.g. 919876543210 for India)</p>
          </div>

          {/* Template picker */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Template</label>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTemplateId(t.id); setVals(['', '', '']) }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${templateId === t.id ? 'bg-green-600 border-green-500 text-white' : 'bg-zinc-700 border-zinc-600 text-zinc-300 hover:bg-zinc-600'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Template fields */}
          {template.fields.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {template.fields.map((field, i) => (
                <div key={field}>
                  <label className="text-xs text-zinc-400 block mb-1">{field}</label>
                  <input
                    value={vals[i] ?? ''}
                    onChange={e => setVals(v => { const n = [...v]; n[i] = e.target.value; return n })}
                    className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:outline-none focus:border-green-500"
                  />
                </div>
              ))}
            </div>
          )}

          {templateId === 'custom' && (
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Message</label>
              <textarea
                value={custom}
                onChange={e => setCustom(e.target.value)}
                rows={4}
                placeholder="Type your message…"
                className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-lg text-sm border border-zinc-600 focus:outline-none focus:border-green-500 resize-none"
              />
            </div>
          )}

          {/* Preview */}
          {message && (
            <div className="bg-zinc-700/50 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1 uppercase tracking-wide">Preview</div>
              <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans">{message}</pre>
            </div>
          )}

          {/* Open in WhatsApp Web */}
          <a
            href={waUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => !waUrl && e.preventDefault()}
            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${waUrl && message ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {waUrl && message ? 'Open in WhatsApp Web' : 'Enter phone number and message to continue'}
          </a>
        </div>
      </div>

      {/* Message log */}
      <div className="bg-zinc-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-700">
          <h3 className="text-sm font-semibold text-zinc-200">Message Log</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Historical messages from previous integration</p>
        </div>
        {mLoading && <div className="p-4 text-zinc-500 text-sm">Loading…</div>}
        {!mLoading && msgList.length === 0 && (
          <div className="p-8 text-center text-zinc-500 text-sm">No message history</div>
        )}
        {msgList.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-700">
                  <th className="text-left px-4 py-2">Direction</th>
                  <th className="text-left px-4 py-2">To/From</th>
                  <th className="text-left px-4 py-2">Message</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {msgList.map((m: any) => (
                  <tr key={m.id} className="hover:bg-zinc-700/30">
                    <td className={`px-4 py-2 capitalize font-medium ${directionColor(m.direction)}`}>{m.direction}</td>
                    <td className="px-4 py-2 text-zinc-300">
                      <div>{m.contact_name ?? '—'}</div>
                      <div className="text-xs text-zinc-500">{m.phone_number}</div>
                    </td>
                    <td className="px-4 py-2 text-zinc-300 max-w-xs">
                      <div className="truncate">{m.content}</div>
                    </td>
                    <td className={`px-4 py-2 capitalize ${statusColor(m.status)}`}>{m.status}</td>
                    <td className="px-4 py-2 text-zinc-500 text-xs">{new Date(m.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
