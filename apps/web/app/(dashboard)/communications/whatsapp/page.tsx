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

  const directionColor = (dir: string) => dir === 'inbound' ? 'text-emerald-600' : 'text-blue-600'
  const statusColor = (s: string) => ({ sent: 'text-slate-500', delivered: 'text-emerald-600', failed: 'text-red-600', read: 'text-blue-600' })[s] ?? 'text-slate-500'

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">WhatsApp</h1>
          <p className="text-sm text-slate-500 mt-0.5">Send messages via WhatsApp Web</p>
        </div>
        <a href="/communications" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">← Communications</a>
      </div>

      {/* Compose */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900">Compose Message</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Phone */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Phone Number (with country code)</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="919876543210"
              className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
            />
            <p className="text-xs text-slate-500 mt-1">Include country code, no + or spaces (e.g. 919876543210 for India)</p>
          </div>

          {/* Template picker */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Template</label>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTemplateId(t.id); setVals(['', '', '']) }}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${templateId === t.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
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
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">{field}</label>
                  <input
                    value={vals[i] ?? ''}
                    onChange={e => setVals(v => { const n = [...v]; n[i] = e.target.value; return n })}
                    className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          )}

          {templateId === 'custom' && (
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Message</label>
              <textarea
                value={custom}
                onChange={e => setCustom(e.target.value)}
                rows={4}
                placeholder="Type your message…"
                className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder:text-slate-400"
              />
            </div>
          )}

          {/* Preview */}
          {message && (
            <div className="bg-slate-50 rounded-lg border border-slate-100 p-3">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Preview</div>
              <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans">{message}</pre>
            </div>
          )}

          {/* Open in WhatsApp Web */}
          <a
            href={waUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => !waUrl && e.preventDefault()}
            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${waUrl && message ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer' : 'bg-slate-100 text-slate-500 cursor-not-allowed'}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {waUrl && message ? 'Open in WhatsApp Web' : 'Enter phone number and message to continue'}
          </a>
        </div>
      </div>

      {/* Message log */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900">Message Log</h3>
          <p className="text-xs text-slate-500 mt-0.5">Historical messages from previous integration</p>
        </div>
        {mLoading && (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: `${80 - i * 8}%` }} />
            ))}
          </div>
        )}
        {!mLoading && msgList.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-500">No message history</div>
        )}
        {msgList.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Direction</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">To/From</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Message</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {msgList.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className={`px-4 py-3 capitalize font-medium ${directionColor(m.direction)}`}>{m.direction}</td>
                    <td className="px-4 py-3 text-slate-800">
                      <div>{m.contact_name ?? '—'}</div>
                      <div className="text-xs text-slate-500">{m.phone_number}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-800 max-w-xs">
                      <div className="truncate">{m.content}</div>
                    </td>
                    <td className={`px-4 py-3 capitalize font-medium ${statusColor(m.status)}`}>{m.status}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(m.created_at).toLocaleString()}</td>
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
