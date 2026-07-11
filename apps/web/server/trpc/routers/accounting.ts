import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import Anthropic from '@anthropic-ai/sdk'
import { router, tenantProcedure } from '../init'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const LineInput = z.object({
  account_id: z.string().uuid(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  description: z.string().optional(),
  sort_order: z.number().int().optional(),
})

export const accountingRouter = router({
  // ── Chart of Accounts ──────────────────────────────────────────────────
  listAccounts: tenantProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .order('code')
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  createAccount: tenantProcedure
    .input(z.object({
      code: z.string().min(1).max(20),
      name: z.string().min(1),
      account_type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
      parent_id: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('chart_of_accounts')
        .insert({ ...input, tenant_id: ctx.tenantId })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  updateAccount: tenantProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      code: z.string().min(1).max(20).optional(),
      parent_id: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const { error } = await ctx.supabase
        .from('chart_of_accounts')
        .update(data)
        .eq('id', id)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { id }
    }),

  deleteAccount: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('chart_of_accounts')
        .delete()
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
        .eq('is_system', false)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { id: input }
    }),

  // ── Journal Entries ─────────────────────────────────────────────────────
  listJournals: tenantProcedure
    .input(z.object({
      status: z.enum(['draft', 'posted', 'voided']).optional(),
      from_date: z.string().optional(),
      to_date: z.string().optional(),
      limit: z.number().int().max(200).default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('journal_entries')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .order('date', { ascending: false })
        .limit(input?.limit ?? 50)
      if (input?.status) query = query.eq('status', input.status)
      if (input?.from_date) query = query.gte('date', input.from_date)
      if (input?.to_date) query = query.lte('date', input.to_date)
      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  getJournal: tenantProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('journal_entries')
        .select('*, journal_lines(*, chart_of_accounts(code, name, account_type))')
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
        .order('sort_order', { referencedTable: 'journal_lines', ascending: true })
        .single()
      if (error) throw new TRPCError({ code: 'NOT_FOUND', message: 'Journal entry not found' })
      return data
    }),

  createJournal: tenantProcedure
    .input(z.object({
      number: z.string().min(1),
      date: z.string(),
      description: z.string().optional(),
      reference_type: z.string().optional(),
      reference_id: z.string().uuid().optional(),
      lines: z.array(LineInput).min(2),
    }))
    .mutation(async ({ ctx, input }) => {
      const { lines, ...head } = input

      // Validate balanced entry
      const totalDebit = lines.reduce((s, l) => s + l.debit, 0)
      const totalCredit = lines.reduce((s, l) => s + l.credit, 0)
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Journal entry must be balanced (debits = credits)' })
      }

      const { data: je, error: jeErr } = await ctx.supabase
        .from('journal_entries')
        .insert({ ...head, tenant_id: ctx.tenantId, created_by: ctx.user.id })
        .select()
        .single()
      if (jeErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: jeErr.message })

      const { error: lineErr } = await ctx.supabase
        .from('journal_lines')
        .insert(lines.map((l, i) => ({ ...l, journal_id: je.id, sort_order: i })))
      if (lineErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: lineErr.message })

      return je
    }),

  postJournal: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('journal_entries')
        .update({ status: 'posted', posted_at: new Date().toISOString() })
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
        .eq('status', 'draft')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { id: input }
    }),

  voidJournal: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('journal_entries')
        .update({ status: 'voided' })
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { id: input }
    }),

  deleteJournal: tenantProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('journal_entries')
        .delete()
        .eq('id', input)
        .eq('tenant_id', ctx.tenantId)
        .eq('status', 'draft')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { id: input }
    }),

  // ── Ledger / Trial Balance ──────────────────────────────────────────────
  trialBalance: tenantProcedure
    .input(z.object({
      from_date: z.string().optional(),
      to_date: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      // Get all posted journal lines joined to accounts
      let query = ctx.supabase
        .from('journal_lines')
        .select(`
          debit, credit,
          chart_of_accounts(id, code, name, account_type),
          journal_entries!inner(tenant_id, status, date)
        `)
        .eq('journal_entries.tenant_id', ctx.tenantId)
        .eq('journal_entries.status', 'posted')
      if (input?.from_date) query = query.gte('journal_entries.date', input.from_date)
      if (input?.to_date) query = query.lte('journal_entries.date', input.to_date)

      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Aggregate by account
      const map = new Map<string, { code: string; name: string; account_type: string; debit: number; credit: number }>()
      for (const row of (data ?? []) as any[]) {
        const acct = row.chart_of_accounts
        if (!acct) continue
        const existing = map.get(acct.id) ?? { code: acct.code, name: acct.name, account_type: acct.account_type, debit: 0, credit: 0 }
        existing.debit += Number(row.debit)
        existing.credit += Number(row.credit)
        map.set(acct.id, existing)
      }
      return Array.from(map.entries()).map(([id, v]) => ({ id, ...v })).sort((a, b) => a.code.localeCompare(b.code))
    }),

  // ── Tally Sync ──────────────────────────────────────────────────────────
  tallyExport: tenantProcedure
    .input(z.object({
      from_date: z.string(),
      to_date: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('journal_entries')
        .select('*, journal_lines(*, chart_of_accounts(code, name))')
        .eq('tenant_id', ctx.tenantId)
        .eq('status', 'posted')
        .gte('date', input.from_date)
        .lte('date', input.to_date)
        .order('date')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Generate Tally XML vouchers
      const vouchers = (data ?? []).map((je: any) => {
        const lines = (je.journal_lines ?? []).map((l: any) =>
          `<ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${l.chart_of_accounts?.name ?? 'Unknown'}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>${l.debit > 0 ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
            <AMOUNT>${l.credit > 0 ? l.credit : -l.debit}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>`
        ).join('\n')
        return `<VOUCHER VCHTYPE="Journal" ACTION="Create">
          <DATE>${je.date.replace(/-/g, '')}</DATE>
          <NARRATION>${je.description ?? ''}</NARRATION>
          <VOUCHERNUMBER>${je.number}</VOUCHERNUMBER>
          ${lines}
        </VOUCHER>`
      }).join('\n')

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          ${vouchers}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`

      // Log sync attempt
      await ctx.supabase.from('tally_sync_log').insert({
        tenant_id: ctx.tenantId,
        record_type: 'journal',
        status: 'success',
        xml_payload: xml.substring(0, 10000),
      })

      return { xml, count: (data ?? []).length }
    }),

  // ── AI Cash-Flow Forecast ─────────────────────────────────────────────
  cashFlowForecast: tenantProcedure
    .input(z.object({ months: z.number().int().min(1).max(12).default(3) }))
    .mutation(async ({ ctx, input }) => {
      // Pull last 6 months of posted journal lines with account types
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const { data: lines, error } = await ctx.supabase
        .from('journal_lines')
        .select(`
          debit, credit, description,
          journal_entries!inner(date, status, tenant_id),
          chart_of_accounts!inner(name, account_type)
        `)
        .eq('journal_entries.tenant_id', ctx.tenantId)
        .eq('journal_entries.status', 'posted')
        .gte('journal_entries.date', sixMonthsAgo.toISOString().slice(0, 10))

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const summary = (lines ?? []).reduce((acc: Record<string, { inflow: number; outflow: number }>, l: any) => {
        const month = (l.journal_entries?.date ?? '').slice(0, 7)
        const type: string = l.chart_of_accounts?.account_type ?? 'unknown'
        if (!acc[month]) acc[month] = { inflow: 0, outflow: 0 }
        if (type === 'revenue') acc[month].inflow += Number(l.credit)
        if (type === 'expense') acc[month].outflow += Number(l.debit)
        return acc
      }, {})

      const historicalText = Object.entries(summary)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([m, v]) => `${m}: inflow ₹${v.inflow.toFixed(0)}, outflow ₹${v.outflow.toFixed(0)}, net ₹${(v.inflow - v.outflow).toFixed(0)}`)
        .join('\n')

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `You are a financial analyst. Here is historical monthly cash flow data for a glass fabrication business:

${historicalText || 'No historical data available yet.'}

Based on this data, provide a ${input.months}-month cash flow forecast. For each month include:
- Expected inflow (₹)
- Expected outflow (₹)
- Net cash flow (₹)
- Key assumption or risk factor

Also provide a 2-3 sentence executive summary and one key recommendation.

Respond with ONLY a raw JSON object in this structure — no markdown code fences, no commentary before or after:
{
  "summary": "...",
  "recommendation": "...",
  "forecast": [
    { "month": "YYYY-MM", "inflow": 0, "outflow": 0, "net": 0, "note": "..." }
  ]
}`,
        }],
      })

      const text = message.content[0]?.type === 'text' ? message.content[0].text : '{}'
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text)
        return parsed
      } catch {
        return { summary: text, recommendation: '', forecast: [] }
      }
    }),
})
