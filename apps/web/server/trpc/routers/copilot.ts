import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import Anthropic from '@anthropic-ai/sdk'
import { router, tenantProcedure } from '../init'
import { enforceRateLimit } from '../../lib/rateLimit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are the in-app copilot for AOC ERP, a glass & furniture fabrication business's internal system based in India. All monetary values are in Indian Rupees (INR) — use the ₹ symbol, never $, when citing amounts. You answer questions about the business's own data (leads, quotations, invoices, work orders, inventory, QC) using the tools provided — never invent numbers. Use a tool whenever the question needs current data; otherwise answer directly. Keep answers short and concrete (numbers, names, a short list) — this is a busy operator checking status, not reading a report. If a tool returns zero rows, say so plainly rather than guessing. You cannot create, edit, or delete anything — you are read-only; if asked to change data, explain the user should use the relevant page in the app.`

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_leads',
    description: 'List leads, optionally filtered by status. Returns count and up to 10 sample rows.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost'], description: 'Optional status filter' },
      },
    },
  },
  {
    name: 'get_quotations',
    description: 'List quotations, optionally filtered by status. Returns count, total value, and up to 10 sample rows.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['draft', 'sent', 'approved', 'rejected', 'converted'], description: 'Optional status filter' },
      },
    },
  },
  {
    name: 'get_invoices',
    description: 'List invoices, optionally filtered by status. Returns count, total value, and up to 10 sample rows.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['draft', 'sent', 'paid', 'partial', 'cancelled'], description: 'Optional status filter' },
      },
    },
  },
  {
    name: 'get_work_orders',
    description: 'List work orders, optionally filtered by status. Returns count and up to 10 sample rows.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['draft', 'cutting', 'grinding', 'tempering', 'laminating', 'assembly', 'qc', 'dispatch', 'delivered', 'cancelled'], description: 'Optional status filter' },
      },
    },
  },
  {
    name: 'get_low_stock_inventory',
    description: 'List inventory items currently at or below their minimum stock level.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_pending_qc',
    description: 'List QC checks currently pending (not yet passed or failed), with up to 10 sample rows.',
    input_schema: { type: 'object', properties: {} },
  },
]

type ToolCtx = { supabase: any; tenantId: string }

async function runTool(ctx: ToolCtx, name: string, input: Record<string, unknown>) {
  const status = typeof input.status === 'string' ? input.status : undefined

  switch (name) {
    case 'get_leads': {
      let q = ctx.supabase.from('leads').select('name, company, status, source').eq('tenant_id', ctx.tenantId)
      if (status) q = q.eq('status', status)
      const { data, error } = await q.limit(10)
      if (error) return { error: error.message }
      const { count } = await (status
        ? ctx.supabase.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId).eq('status', status)
        : ctx.supabase.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId))
      return { count, sample: data }
    }
    case 'get_quotations': {
      let q = ctx.supabase.from('quotations').select('number, total, status, created_at').eq('tenant_id', ctx.tenantId)
      if (status) q = q.eq('status', status)
      const { data, error } = await q.order('created_at', { ascending: false }).limit(10)
      if (error) return { error: error.message }
      const totalValue = (data ?? []).reduce((s: number, r: any) => s + (Number(r.total) || 0), 0)
      return { count: data?.length ?? 0, totalValueOfSample: totalValue, sample: data }
    }
    case 'get_invoices': {
      let q = ctx.supabase.from('invoices').select('number, total, status, invoice_date').eq('tenant_id', ctx.tenantId)
      if (status) q = q.eq('status', status)
      const { data, error } = await q.order('invoice_date', { ascending: false }).limit(10)
      if (error) return { error: error.message }
      const totalValue = (data ?? []).reduce((s: number, r: any) => s + (Number(r.total) || 0), 0)
      return { count: data?.length ?? 0, totalValueOfSample: totalValue, sample: data }
    }
    case 'get_work_orders': {
      let q = ctx.supabase.from('work_orders').select('number, status, created_at').eq('tenant_id', ctx.tenantId)
      if (status) q = q.eq('status', status)
      const { data, error } = await q.order('created_at', { ascending: false }).limit(10)
      if (error) return { error: error.message }
      return { count: data?.length ?? 0, sample: data }
    }
    case 'get_low_stock_inventory': {
      const { data, error } = await ctx.supabase
        .from('inventory_items')
        .select('name, code, current_stock, min_stock, unit')
        .eq('tenant_id', ctx.tenantId)
      if (error) return { error: error.message }
      const low = (data ?? []).filter((i: any) => Number(i.current_stock) <= Number(i.min_stock || 0))
      return { count: low.length, items: low.slice(0, 15) }
    }
    case 'get_pending_qc': {
      const { data, error } = await ctx.supabase
        .from('qc_checks')
        .select('check_name, wo_id, created_at')
        .eq('tenant_id', ctx.tenantId)
        .eq('status', 'pending')
        .limit(10)
      if (error) return { error: error.message }
      return { count: data?.length ?? 0, sample: data }
    }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

const MessageInput = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

export const copilotRouter = router({
  chat: tenantProcedure
    .input(z.object({ messages: z.array(MessageInput).min(1).max(20) }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(`copilot-chat:${ctx.tenantId}`, 20, 60_000)

      const messages: Anthropic.MessageParam[] = input.messages.map(m => ({ role: m.role, content: m.content }))

      let response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      })

      // Single tool-use round: if Claude asked for data, run the whitelisted read-only
      // queries and let it produce a final answer. Bounded to one round-trip to keep
      // latency/cost predictable — this is a Q&A copilot, not an open-ended agent loop.
      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        )

        const toolResults = await Promise.all(
          toolUseBlocks.map(async (block) => {
            const result = await runTool(ctx, block.name, block.input as Record<string, unknown>)
            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: JSON.stringify(result),
            }
          })
        )

        messages.push({ role: 'assistant', content: response.content })
        messages.push({ role: 'user', content: toolResults })

        response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages,
        })
      }

      const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text
      if (!text) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'No response generated' })

      return { reply: text }
    }),
})
