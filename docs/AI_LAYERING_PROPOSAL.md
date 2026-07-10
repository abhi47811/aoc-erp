# AI Layering Proposal — AOC ERP

Grounded in the actual codebase (22 tRPC routers, Supabase schema, 21 dashboard modules). Stack: `@anthropic-ai/sdk` already a dependency in `packages/ai` and `apps/web/server/trpc/routers/accounting.ts`. No AI SDK v6 / streaming yet — direct Anthropic SDK calls only.

## 1. What already exists

| Feature | File | Model | Status |
|---|---|---|---|
| **Cash-flow forecast** | `server/trpc/routers/accounting.ts:316` | `claude-haiku-4-5` | Live, working, has UI at `/accounting/cashflow` |
| **Glass measurement extraction** | `packages/ai/src/index.ts` (`extractGlassMeasurements`), called from `server/trpc/routers/drawing.ts:77` (`extract`) | `claude-opus-4-8`, vision | **Backend fully built, zero UI.** `/drawings` route 404s — sidebar links to a page that was never created. Uploads go to Supabase Storage (`drawings` bucket), extraction result stored in `drawings.ai_extracted` (jsonb), status tracked via `ai_status`/`ai_error`. This is a dead feature — highest-leverage quick win in this whole proposal. |
| **"Ask AI" button** | `components/topbar.tsx:38` | none | Visual-only, no `onClick`, no backend. Only rendered on the `leads` page (Topbar isn't wired into any other page). |

**Cash-flow forecast implementation detail** (the one working reference pattern): pulls last 6 months of `journal_entries` (posted only), formats as text table, sends to Claude with a structured prompt asking for N-month forecast (inflow/outflow/net/risk factor per month) + 2-3 sentence summary + one recommendation. Output parsed as free text (not tool-use/structured output) — works but fragile, no retry-on-malformed-output.

## 2. Per-workflow findings (input → manual pain → output)

### Sales pipeline (`lead`, `client`, `quotation`, `project`, `architect`)
- **Input**: Leads/clients/architects are single-record manual forms (name, phone, source, notes — all free text). Quotations are the heaviest manual entry: each line item (glass type, dimensions, qty, rate) typed by hand; `calcItem()` computes `area_sqm`/`amount` from width×height, but the dimensions themselves are typed, not measured.
- **Manual pain**: no lead→quotation carryover beyond copy-paste; no duplicate-client detection; no drafting assist for quotation cover notes; architect referral tracking is pure lookup, no relationship insight.
- **Output**: list views + PDF quotation (existing, non-AI). Status badges only.

### Procurement/inventory (`inventory`, `purchase`, `supplier`, `bom`, nesting)
- **Input**: PO line items (`POItemInput`: qty, unit_price, description) fully manual — no supplier catalog/price-history autofill, no matching against previous POs to the same supplier.
- **Manual pain**: `inventory.lowStock` exists (query) but reorder qty/timing is a human judgment call every time; BOM `calcCost` is deterministic math, not AI — fine as-is.
- **Nesting** (`/nesting` page): glass sheet cutting layout — this is an *optimization* problem (2D bin-packing), not a generation problem. Not a good fit for an LLM call; if the current algorithm is greedy/naive, the right fix is a proper bin-packing algorithm, not AI. Flagging so it doesn't get miscategorized as an "AI opportunity."

### Production/QC/delivery (`workOrder`, `qc`, `delivery`, `drawing`)
- **Input**: QC checks (`qc.ts:37` `upsertChecks`) are free-text `check_name` + manual pass/fail + free-text `notes` — no photo evidence field at all today. Work order creation/status update is manual dropdown selection.
- **Manual pain**: QC has zero visual evidence capture — a defect is only ever a text note, never a photo. Delivery POD (`recordPOD`) is presumably manual entry too (not fully read, but the pattern holds).
- **Output**: status boards only, no anomaly detection (e.g. "this WO has failed QC 3x, flag it").

### Finance/comms/admin (`invoice`, `accounting`, `gst`, `reports`, `whatsapp`, `admin`)
- **Input**: Invoice line items manual, same pattern as quotations. GST reconciliation (`gst.ts:112`) is presumably manual matching against GSTR data.
- **Manual pain**: **WhatsApp integration is not real** — `whatsapp.ts` only builds a `wa.me/...?text=...` click-to-chat link with a hardcoded template string. There is no inbound message handling, no AI-drafted replies, no classification of incoming messages. "Communications" module is a link generator, not a bot.
- **Output**: Reports (`sales`, `production`, `inventory`, `financial`) are raw data tables — no narrative summary, no anomaly flagging, no "what changed vs last period."

## 3. Recommended AI layers (input-side)

Ranked by leverage (built-vs-needed effort × business value):

1. **Ship the drawings UI** (½ day). The extraction backend already exists and works. Build `/drawings` page: upload → list → "Extract Measurements" button → review extracted items → **one-click "Create Quotation from Drawing"** that pre-fills `quotation_items` from `ai_extracted.items`. This closes the loop from "architect sends a PDF/photo" → "quotation line items appear," which is the single biggest manual-entry killer in the sales pipeline.
2. **QC photo evidence + defect classification.** Add a photo upload field to `qc_checks`, and a vision call (same pattern as `extractGlassMeasurements`) that looks at a photo of a flagged defect and suggests a defect category + severity — human still clicks pass/fail, AI just pre-fills the classification.
3. **PO line-item autofill from supplier price history.** When creating a PO, given `supplier_id` + free-text item description, look up the last 3 POs to that supplier and suggest qty/unit_price — this is a straightforward SQL lookup + optional LLM disambiguation for fuzzy item-name matching, not a big lift.
4. **Conversational intake** (see chat tool below) — voice/text "create a lead for X" instead of the form.

## 4. Recommended AI layers (output-side)

1. **Extend cash-flow-forecast pattern to reports.** Same shape (pull data → Claude → narrative) applied to `reports.sales`/`reports.production`/`reports.financial`: a "Summarize this report" button that generates 2-3 sentence narrative + flags anomalies (e.g. "sales dropped 20% vs last month, driven by X category"). Directly reuses the existing `packages/ai` pattern — lowest-risk next AI feature to build.
2. **Real WhatsApp AI layer.** Two parts: (a) AI-drafted reply suggestions for the existing templates (`sendQuotationReady`/`sendDeliveryUpdate` already have hardcoded copy — let Claude vary tone/language per client instead of one fixed string), (b) if inbound WhatsApp webhook is ever added, classify+route incoming messages (this is currently 100% absent — outbound-link-only).
3. **GST reconciliation assist.** `gst.reconcile` — if this is currently manual line matching, an LLM/fuzzy-match pass to pre-match GSTR-2A entries to purchase invoices, flagging only the unmatched exceptions for human review, saves the most tedious part of GST close.
4. **Work-order anomaly flagging.** A scheduled/on-demand check across `qc_checks` + `work_orders`: "which WOs/suppliers/glass-types have abnormal failure rates" — output-side pattern detection, not per-record generation.

## 5. Chat-based tool (data access + intake + file upload extraction)

This directly replaces the dead `topbar.tsx:38` "Ask AI" button with a real feature. Three capabilities in one surface:

**a. Data access via chat** — natural-language → tRPC query. "Show me open leads from this week" → classify intent → call `lead.list` with appropriate filter → render as a table inline in the chat panel. Scope this to READ-ONLY queries across existing list/get procedures initially (leads, quotations, invoices, work orders, inventory) — safe, no new mutation risk.

**b. Conversational intake** — "Create a lead: Rajesh Kumar, 98765xxxxx, referred by ABC Architects, interested in office partition glass" → Claude extracts structured fields matching `lead.create`'s input schema → shows a confirm card (editable) → human approves → calls the mutation. Same guardrail pattern as the cashflow forecast: AI drafts, human confirms, nothing writes without an explicit click.

**c. File upload → extraction** — generalize `extractGlassMeasurements` beyond just drawings. Reuse the exact same vision-call pattern for:
   - Supplier quote/invoice PDFs → auto-fill PO line items
   - Photos of existing installations → auto-generate a lead/quotation with estimated dimensions
   - GST/bank statement PDFs → auto-fill accounting journal entries

**Architecture**:
- New router `server/trpc/routers/copilot.ts`: `chat` (streaming), `extractFile` (generalizes drawing.extract to accept a `docType` param and route to the right extraction prompt/schema).
- Extend `packages/ai/src/index.ts` beyond the single `extractGlassMeasurements` function — turn it into a small toolkit: `extractGlassMeasurements`, `extractPOFromDocument`, `classifyIntent`, `draftReply`, `summarizeReport`. All Anthropic SDK, consistent with what's already there — no need to introduce AI SDK v6 unless streaming chat UI is wanted (recommended for the chat panel specifically, since typing indicators/streaming matter for UX there — everything else can stay as direct non-streaming calls like the existing cashflow pattern).
- UI: replace `topbar.tsx`'s dead button with a slide-over panel (chat history + file drop zone), wire into every page via the Topbar — but note Topbar currently only renders on `/leads`; this requires either moving Topbar into `(dashboard)/layout.tsx` globally (recommended, was flagged as a design inconsistency during the earlier UI redesign) or duplicating the copilot trigger elsewhere.
- Every AI-drafted output requires human confirm-before-write — matches the existing guardrail-by-convention already implicit in the cashflow forecast (it only *displays* a forecast, never auto-posts a journal entry).

## 6. Suggested build order

1. `/drawings` page (exposes existing dead backend) — near-zero new AI code, pure UI.
2. Report summarization (reuses cashflow pattern verbatim on new data).
3. Copilot chat panel — read-only data access first (safest slice).
4. Conversational intake (adds write-path, needs confirm-before-write UI).
5. File-upload extraction generalized beyond drawings (PO/invoice/bank docs).
6. QC photo + defect classification.
7. WhatsApp AI drafting / GST reconciliation assist (more integration-heavy, lower urgency).
