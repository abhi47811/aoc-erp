# AOC ERP — Design System

**Status:** Documentation of the system as implemented, plus specified extensions. No code in this repo was changed to produce this document.

**Scope:** `apps/web` (Next.js 15 App Router, Tailwind v4, `@base-ui/react` primitives, `lucide-react` icons). Every pattern below is grounded in what's actually built — [globals.css](../apps/web/app/globals.css), [sidebar.tsx](../apps/web/components/sidebar.tsx), [topbar.tsx](../apps/web/components/topbar.tsx), and the ~50 dashboard pages under `app/(dashboard)/` — not invented from scratch. Where the reference screenshot (a generic "Vantus ERP" admin panel) suggested something AOC doesn't have yet, it's called out explicitly as **new** and adapted to AOC's actual data (glass/furniture fabrication: leads → quotations → work orders → QC → delivery, not a generic SaaS admin panel).

---

## 1. Design principles

1. **Dense but calm.** This is an operator tool for people processing leads, purchase orders, and work orders all day — not a marketing site. Every screen favors information density (tables, compact stat cards) over whitespace-heavy SaaS marketing aesthetics, but never at the cost of a 44px+ touch target or legible 8px+ padding.
2. **One accent, semantic elsewhere.** Blue is the only "brand" color used for actions and active states. Every other color (green, amber, red, violet, orange) is **semantic only** — it means a specific status and nothing else. Never introduce a new color for decoration.
3. **The sidebar is dark, everything else is light.** This single inversion is AOC's visual signature (confirmed in every existing page) — don't blur it by lightening the sidebar or darkening content pages.
4. **Every list is a table until proven otherwise.** Card grids are for dashboards and summaries (stat cards, the Management role-cards described in §11). Operational data — leads, clients, work orders, purchase orders — is always a table, because these are the objects people scan, sort, and click into.
5. **Real data, not decoration.** No placeholder avatars, no fake activity feeds. AOC has no user-avatar-photo concept today — initials-in-a-gradient-circle is the pattern (see §3), not stock photography like the reference screenshot uses.

---

## 2. Design tokens

All tokens are already defined in [`app/globals.css`](../apps/web/app/globals.css) via Tailwind v4's `@theme`. This section documents them as the canonical reference — do not hardcode raw hex/oklch values in components; use the token or its Tailwind utility.

### 2.1 Color

| Token | Value | Tailwind utility | Use |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` (white) | `bg-background` | Page canvas |
| `--foreground` | `oklch(0.145 0 0)` | `text-foreground` | Body text |
| `--border` | `oklch(0.922 0 0)` | `border-border` | Default hairlines |
| `--muted-foreground` | `oklch(0.556 0 0)` | `text-muted-foreground` | Secondary text |
| `--primary` | `oklch(0.205 0 0)` | `bg-primary` | Reserved (see note) |
| `--sidebar` | `oklch(0.985 0 0)` (token exists; **actual sidebar is a dark slate gradient**, see §3.1) |  |  |
| `--radius` | `0.625rem` | `rounded-lg` and the `--radius-*` scale | Base corner radius |

**Note on `--primary`:** the CSS token is a near-black (shadcn default), but every implemented page uses **`blue-500`→`blue-600` gradients** (Tailwind's stock blue scale, not a CSS var) as the actual brand/action color. Treat Tailwind's `blue-{50,100,500,600,700}` as the de facto primary palette until `--primary` is repointed to match — don't introduce a third blue.

**Semantic status colors** — every badge, alert, and status chip in the app uses this exact 3-part recipe: `bg-{color}-50 text-{color}-700 border border-{color}-100`. Never use a solid/filled badge for status; the -50/-700/-100 trio is the only approved status treatment.

| Status meaning | Color | Example use |
|---|---|---|
| New / informational | `blue` | Lead status "New", info banners |
| Pending / attention | `amber` | "Contacted", "Processing", warnings |
| In-progress / distinct stage | `violet` | "Qualified" |
| Escalated / mid-risk | `orange` | "Proposal Sent" |
| Success / active / done | `emerald` | "Won", "Enabled", "Active", `ai_status: done` |
| Failure / inactive / destructive | `red` | "Lost", "Disabled", `ai_status: failed`, delete actions |
| Neutral / no status | `slate` (100/600) | Unknown, N/A |
| AI-specific accent | `purple` | "Ask AI" button, AI-generated content markers |

India-specific tokens already reserved for future use: `--saffron` (28 100% 57%), `--india-green` (120 61% 34%), `--whatsapp` (142 70% 49%). Use `--whatsapp` if/when WhatsApp-specific UI (already has a stub page) gets a distinct accent; don't repurpose these for anything else.

### 2.2 Elevation

Four shadow levels, already defined as utility classes — use these, not raw `shadow-*` Tailwind defaults:

| Class | box-shadow | Use |
|---|---|---|
| `.shadow-elevation-xs` | `0 1px 2px rgb(15 23 42/.04)` | Default card/table resting state, sticky topbar |
| `.shadow-elevation-sm` | subtle 2-layer | Rarely used directly; reserve for slightly-raised inline elements |
| `.shadow-elevation-md` | `0 4px 12px…` | Card hover state, active dropdowns |
| `.shadow-elevation-lg` | `0 12px 24px…` | Modals, popovers |
| `.shadow-glow-blue` | ring + blue glow | Active nav rail indicator, logo mark, primary CTA hover |

### 2.3 Radius

| Token | Value | Use |
|---|---|---|
| `rounded-md` (`--radius-md`) | 0.5rem | Small chips, nav items, kbd |
| `rounded-lg` (`--radius-lg`, base) | 0.625rem | Buttons, inputs, filter pills |
| `rounded-xl` | 0.875rem | **Every card and table wrapper** — the single most-used radius in the app |
| `rounded-2xl` | 1.125rem | Modals |
| `rounded-full` | — | Avatars, status dots, pill badges when content is a single word |

### 2.4 Motion

| Token | Value |
|---|---|
| `--animation-fast` | 100ms — micro-interactions (icon color change) |
| `--animation-normal` | 200ms — hover lifts, dropdown open |
| `--animation-slow` | 300ms — page-enter fade, modal entrance |
| `--ease-out-smooth` | `cubic-bezier(0.16, 1, 0.3, 1)` — use for everything; don't introduce linear/ease-in-out |

Standard hover-lift interaction (buttons, cards): `transition-all duration-150 ease-out-smooth hover:-translate-y-px` paired with a shadow step-up (`shadow-sm` → `shadow-md`). This exact combination appears on every primary button and card in the app — it is the house micro-interaction, not a one-off.

`prefers-reduced-motion: reduce` is already globally handled (all animations collapse to 0.01ms) — never gate an individual component's motion manually; the global rule covers it.

### 2.5 Typography

No custom type scale exists yet beyond Tailwind defaults + one custom font-family var (`--font-heading` = `--font-sans`, i.e., headings use the same sans stack as body — there is no separate display font). Codify the sizes actually in use:

| Role | Class | Example |
|---|---|---|
| Page title | `text-xl font-bold text-slate-900 tracking-tight` | "Leads", "Team Management" |
| Section/card title | `text-base font-semibold text-slate-900` | Modal headings |
| Table header | `text-xs font-medium text-slate-500 uppercase tracking-wider` | Column headers |
| Body / table cell | `text-sm` | Default |
| Primary cell value | `text-sm font-medium text-slate-900` | Name columns |
| Secondary / muted | `text-sm text-slate-500` | Subtitles, secondary columns |
| Micro label | `text-xs text-slate-400` | Helper text, counts |
| Stat value | `text-2xl font-bold text-slate-900 tabular-nums tracking-tight` | Dashboard KPIs — always `tabular-nums` for numbers that update |
| Nav group label | `text-[10px] font-semibold uppercase tracking-widest text-slate-600` | Sidebar section headers |

**Rule:** never introduce `text-lg` or `text-2xl` for a page title — `text-xl font-bold tracking-tight` is the fixed page-title size across all ~50 pages. Reserve `text-2xl` exclusively for stat values.

### 2.6 Spacing

Tailwind's default scale, used consistently:

- **Page container:** `space-y-6` between major sections (header → filters → content).
- **Card padding:** `p-5` for stat/content cards, `p-6` for modals.
- **Table cell padding:** `px-4 py-3` (py-3.5 on data rows for slightly taller touch targets than header rows).
- **Form field gap:** `space-y-3` within a form, `mb-1.5` between label and input.
- **Sidebar item gap:** `space-y-0.5` within a group, `mb-4` between groups.
- **Icon-to-label gap:** `gap-2` (small icons, buttons) or `gap-2.5` (nav items).

---

## 3. Layout & navigation

### 3.1 Shell

Three-region shell, fixed in [`(dashboard)/layout.tsx`](../apps/web/app/(dashboard)/layout.tsx):

```
┌─────────┬──────────────────────────────┐
│         │  Topbar (h-14, sticky)       │
│ Sidebar │──────────────────────────────│
│ (56/60) │  main (overflow-y-auto)      │
│         │   └─ max-w-[1440px] mx-auto  │
│         │       p-6                    │
└─────────┴──────────────────────────────┘
```

- Content is capped at `max-w-[1440px]` and centered — on ultra-wide monitors the shell doesn't stretch tables to unreadable widths.
- **Do not** add any transform (translate/scale/rotate, including via an animation with `fill-mode: both`) to the page-content wrapper — a CSS spec gotcha already caused a real bug where every modal in the app rendered clipped behind the topbar, because a non-`none` transform on an ancestor becomes the containing block for `position: fixed` descendants. The content wrapper must stay transform-free.

### 3.2 Sidebar

- **Dark slate**, `bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950`. Width `w-56` expanded, `w-[60px]` collapsed, animated via `transition-all duration-200`.
- Logo mark: 28px rounded-lg gradient square with a single glyph, `shadow-glow-blue`.
- **Grouped navigation** — items are organized into named groups (Overview, CRM, Operations, Sales, Production, Finance, System), each with an uppercase `text-[10px]` label. Group AOC's ~20 nav items by business function, never as one flat list.
- **Active state:** left rail indicator (`3px` rounded bar, `bg-blue-400` + glow) + subtle gradient background (`from-blue-500/15 to-blue-500/5`) + `text-blue-300`. This is richer than a simple background-color swap — replicate the rail-indicator pattern for any new nav-like list (e.g., in-page tabs), not just the sidebar.
- Collapsed state shows icon-only with a `Tooltip` (side="right") — every collapsed nav item **must** have a tooltip; icon-only with no tooltip is not acceptable (fails discoverability).
- Collapse toggle is a full-width footer button, not a floating chevron — keep it docked to the bottom edge.

### 3.3 Topbar

- `h-14`, `bg-white/80 backdrop-blur-md`, sticky, `shadow-elevation-xs`, `z-30`.
- Left: breadcrumbs (last segment bold `text-slate-900`, others `text-slate-500`, `/` separator in `text-slate-300`). **Every page must pass breadcrumbs** — it's the only page-identity signal in the topbar besides the browser tab.
- Right, in fixed order: Cmd+K search trigger → AI button (purple gradient, `Sparkles` icon, "Ask AI") → notifications bell (red dot badge when unread) → divider → avatar (initials, gradient circle) → sign-out icon button.
- The AI button is intentionally the one non-blue accent in the whole chrome (`purple-500`→`purple-700` gradient) — it must stay visually distinct from primary actions so users don't confuse "do a thing" buttons with "ask the assistant" — never restyle it blue.

### 3.4 Page header pattern

Every list/detail page opens with the same header shape:

```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
    <p className="text-sm text-slate-500 mt-0.5">{count} total {noun}</p>
  </div>
  <button className="...primary button...">+ New {Noun}</button>
</div>
```

Detail pages (`/leads/[id]` etc.) additionally prefix the title with a `← Back` link, a `|` divider, and the record's short code (`PRJ-2026-001`-style) in `font-mono text-xs text-slate-500`.

---

## 4. Cards

Two card families exist. Do not invent a third.

### 4.1 Content card (tables, forms, panels)

```
bg-white rounded-xl border border-slate-200 shadow-elevation-xs [p-5 | overflow-hidden for tables]
```
Optional hover: `hover:shadow-md hover:border-slate-300 transition-all` — use only on cards that are themselves clickable/navigable (e.g., a summary card linking to a detail page). Static content cards (a form, a table) don't get hover elevation — that would falsely imply the whole card is clickable.

### 4.2 Stat card

```tsx
<div className="bg-white rounded-xl border border-slate-200 shadow-elevation-xs p-5 hover:shadow-md hover:border-slate-300 transition-all group relative overflow-hidden">
  <div className="absolute top-0 left-0 right-0 h-0.5 {accentColor}" />
  <div className="flex items-start justify-between mb-4">
    <div className="w-9 h-9 rounded-lg {iconBg} flex items-center justify-center"><Icon size={16} className={iconColor} /></div>
  </div>
  <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">{value}</p>
  <p className="text-xs font-medium text-slate-500 mt-1.5 uppercase tracking-wider">{label}</p>
</div>
```
- Top accent bar (`h-0.5`) in the metric's semantic color — a 40%-opacity version of the icon chip's background.
- Loading state: replace the value with `h-8 w-20 bg-slate-100 animate-pulse rounded-md` — never show `0` or blank while loading, always the skeleton.
- Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` for a 6-metric dashboard row — collapses gracefully to 2 columns on mobile rather than a horizontal scroll.

### 4.3 Role/group card — new, adapted from the reference

The reference screenshot's 3-card role summary (Super Admin / Manager / Accountant, each listing 3 members + "Manage" button) doesn't exist yet in AOC but maps cleanly onto the existing [Management page](../apps/web/app/(dashboard)/management/page.tsx), which currently only renders a flat table. **Add a card row above the existing table**, one card per role tier (not per exact role — AOC has 10 granular roles, too many for 10 cards):

- **Leadership** — `owner` + `admin`
- **Operations Managers** — `sales_manager`, `production_manager`, `purchase_manager`
- **Finance** — `accountant`
- **Field Staff** — `salesperson`, `production_staff`, `delivery_staff`
- **Read-only** — `viewer`

Each card: role-group name + `See All` link (top-right, `text-sm border rounded-lg px-3 py-1.5`, matching the reference's button style but in AOC's existing button language, not a new one) → up to 3 member rows (initials avatar 32px, name `text-sm font-medium`, email `text-xs text-slate-400`, right-aligned Enabled/Disabled badge using the emerald/slate status pair from §2.1) → a full-width `Manage` button (`bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg py-2.5`, not a primary blue button — this is a secondary navigation action, not a form submit).

Card grid: `grid grid-cols-1 lg:grid-cols-3 gap-6` mirroring the dashboard's existing 2-column content grid pattern, extended to 3.

---

## 5. Tables

The single table pattern used everywhere — leads, clients, suppliers, work orders, team management:

```tsx
<div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-elevation-xs">
  <table className="w-full text-sm">
    <thead className="border-b border-slate-100 bg-slate-50">
      <tr>{columns.map(c => <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{c}</th>)}</tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {rows.map(row => (
        <tr onClick={() => navigate(row)} className="hover:bg-slate-50 transition-colors cursor-pointer">
          <td className="px-4 py-3.5 font-medium text-slate-900">{primary}</td>
          <td className="px-4 py-3.5 text-slate-500">{secondary ?? '—'}</td>
          ...
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

Rules:
- **Missing values render as `—`** (em dash), never blank, never "N/A", never "null".
- **Rows are clickable when the entity has a detail page**; the last column is reserved for row-scoped actions (Delete, role `<select>`) and must call `e.stopPropagation()` so the row click doesn't also fire.
- **First column is always the primary identifier** (name), bold, `text-slate-900`; every other column is `text-slate-500`.
- Status/role columns render a badge (§2.1), never plain text.
- Tables do not paginate today (all lists render fully) — if a list grows past ~200 rows, add pagination or virtualization as a new pattern rather than letting tables silently degrade; this doc doesn't prescribe the mechanism since no page has hit that threshold yet.

### 5.1 New for role management: filterable/tabbed table (adapted from reference)

The reference's "Administrator Accounts" section — tab-filtered count pills (`All (19)`, `Super Admin (3)`...) above a search+sort+table row — is a genuinely new pattern worth adopting for the Management page's full member table, replacing the current unfilterable flat list:

```tsx
<div className="flex items-center justify-between">
  <h2 className="text-base font-semibold text-slate-900">Administrator Accounts</h2>
  <div className="flex items-center gap-2">
    <SearchInput /> {/* text-sm px-3.5 py-2 border-slate-300 rounded-lg, Search icon left */}
    <SortDropdown />
  </div>
</div>
<div className="flex gap-1 border-b border-slate-200">
  {tabs.map(t => (
    <button className={cn(
      "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
      active ? "border-blue-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
    )}>{t.label} ({t.count})</button>
  ))}
</div>
{/* table as in §5, filtered by active tab */}
```
Tab underline uses `border-blue-600`, matching the sidebar's blue active-rail language — keep the active-indicator color consistent across every navigation-like control in the app (sidebar rail, table tabs, any future top-level tabs).

---

## 6. Forms & modals

- **Modal shell:** `fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4` overlay → `bg-white border border-slate-200 rounded-2xl shadow-elevation-lg animate-fade-in-up w-full max-w-md p-6 space-y-4` panel. `max-w-md` for simple create forms, widen to `max-w-lg`/`max-w-2xl` only for genuinely multi-field forms (e.g., project creation) — never widen a 4-field form just for visual weight.
- **Field pattern:**
  ```tsx
  <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}{required && ' *'}</label>
  <input className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
  ```
  Required fields get a literal `*` appended to the label text, not a separate asterisk element or color — keep it simple and screen-reader-natural.
- **Errors:** a single `<p className="text-red-600 text-sm">{message}</p>` above the form, populated from the mutation's `onError`. Field-level inline errors aren't used anywhere yet — if introducing them, keep the same `text-red-600 text-sm` treatment directly under the offending field.
- **Footer actions:** two-button row, `flex gap-3 pt-2` — Cancel (`flex-1 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50`) + Submit (`flex-1` primary gradient button, `disabled:opacity-50` while pending, label swaps to a "…ing" gerund e.g. "Sending…" during the mutation).
- **AI-assisted fields** (business card scan, GST cert scan): a small text-button (`text-xs font-medium text-blue-600`) in the modal header row, prefixed with an emoji icon matching the source (📇 card, 📄 document) — this is the one place emoji-as-icon is acceptable in the whole system, because it doubles as a physical-object metaphor a `lucide-react` icon can't convey as quickly. Don't extend emoji use beyond scan triggers.

---

## 7. Filters

`MultiSelectFilter` ([ui/multi-select-filter.tsx](../apps/web/components/ui/multi-select-filter.tsx)) is the one filter primitive — a button that becomes a filled `bg-blue-600` pill showing a count when active, opening a checkbox-list popover with Select All / Clear. Reuse this component for every filterable column (status, source, role, category) rather than building bespoke filter UI per page. Multiple filters sit in a `flex gap-2 flex-wrap` row directly under the page header, above the table — never inline in the table header itself.

---

## 8. Status badges

Single component shape used for every status everywhere (lead status, drawing `ai_status`, user enabled/disabled, work order stage):

```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium {bg-x-50 text-x-700 border border-x-100}">
  {label}
</span>
```
- Always `capitalize` or pre-formatted label text (`status.replace('_', ' ')` at minimum) — never render a raw snake_case enum value.
- Color mapping is a `Record<Status, string>` constant colocated with the page that owns that status enum (see `STATUS_COLORS` in `leads/page.tsx`) — don't centralize into one giant cross-domain map, since "won"/"lost" (leads) and "done"/"failed" (AI extraction) are semantically unrelated even if they'd reuse the same emerald/red colors.
- **Never** use a solid-fill badge (e.g. `bg-emerald-600 text-white`) — the -50/-700/-100 trio is the only approved treatment, full stop, including for the new role-management cards in §4.3.

---

## 9. Buttons

| Variant | Classes | Use |
|---|---|---|
| Primary | `bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25 hover:-translate-y-px transition-all duration-150 ease-out-smooth px-4 py-2 rounded-lg text-sm font-medium` | "+ New X", form submit |
| Secondary | `border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm` | Cancel, "Manage" (role cards) |
| Ghost/text | `text-slate-400 hover:text-red-500 text-xs transition-colors` (destructive) or `text-blue-600 hover:text-blue-700 text-xs` (neutral) | Row-scoped Delete, inline links |
| AI | `bg-gradient-to-br from-purple-500 to-purple-700 ... shadow-purple-500/25` | Ask AI only — never reuse for other "smart" features without deliberately deciding they share the AI button's visual identity |
| Icon-only | `p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100` | Topbar icons — always paired with a `Tooltip` and `aria-label` |

All interactive buttons carry `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-{blue|purple}-500` — never remove focus rings; the global `:focus-visible` CSS rule is a fallback, not a substitute for the explicit ring utility on custom-shaped controls.

---

## 10. Accessibility

Already-established rules, confirmed in the code — keep enforcing them for every new component:

1. **Every icon-only control has `aria-label`.** No exceptions — confirmed pattern on sidebar collapse toggle, topbar icons, notifications.
2. **Tooltips work on keyboard focus, not just hover** ([Tooltip](../apps/web/components/ui/tooltip.tsx) uses `onFocus`/`onBlur` alongside `onMouseEnter`/`onMouseLeave`, per WCAG 2.1.1). Any new hover-revealed UI must follow this — hover-only interactivity is a hard accessibility bug, not a nice-to-have.
3. **`aria-current="page"`** on the active sidebar link.
4. **Focus rings are never `outline-none` without a replacement ring** — every custom-focus-styled element pairs `focus:outline-none` with `focus:ring-2`.
5. **`prefers-reduced-motion`** is handled globally — don't add per-component overrides that fight it.
6. **Color is never the only signal.** Status badges pair color with text label, not a bare colored dot (the notification bell's red dot is the one exception, acceptable because it's a count/presence indicator, not a status requiring differentiation between multiple states).
7. **Checkboxes and radios** in filter popovers use real `<input type="checkbox">` with an associated `<label htmlFor>` — not a styled `<div>` — preserving native keyboard and screen-reader behavior.

**New requirement to add going forward:** the role-management cards (§4.3) and tabbed table (§5.1) must carry `role="tablist"`/`role="tab"`/`aria-selected` on the tab row, since visually they read as tabs — the current flat-table Management page has no such ARIA because it isn't tabbed yet.

---

## 11. Role & permission management

This is the section the reference screenshot is really about — documenting AOC's actual model, which is meaningfully different (and more granular) than the reference's generic 3-tier Super Admin/Manager/Accountant scheme.

### 11.1 The model (as implemented in [`lib/rbac.ts`](../apps/web/lib/rbac.ts))

- **10 roles**, not 3: `owner`, `admin`, `sales_manager`, `salesperson`, `production_manager`, `production_staff`, `accountant`, `purchase_manager`, `delivery_staff`, `viewer`.
- **Weighted hierarchy** (`ROLE_WEIGHT`, 10–100) exists for `isAtLeastRole()` checks, separate from the granular per-action `PERMISSIONS` map used for `hasPermission()` — most UI gating uses the latter, not the weight.
- **`owner`** is set once at tenant signup and is not in `ASSIGNABLE_ROLES` — the invite/role-change UI can never grant Owner; this is enforced today by `ASSIGNABLE_ROLES` excluding it, and the Management page's table specifically special-cases the Owner row (no role `<select>`, shown as a plain "Owner" badge) — preserve this asymmetry in any redesign, don't let it become editable.
- **~24 named permissions** (`MANAGE_LEADS`, `APPROVE_QUOTE`, `CREATE_PO`, `VIEW_FINANCE`, etc.), each mapped to the specific roles that hold it — this is what actually gates every `authorizedProcedure()` call server-side. The UI's job is to make this map legible, not to reinvent it.

### 11.2 Page-level guidance for Management

- Keep the existing invite modal (email + role select, [management/page.tsx](../apps/web/app/(dashboard)/management/page.tsx)) — it already follows §6.
- **Add** the role-group card row (§4.3) above the existing table as the new top-of-page summary.
- **Add** the tab-filtered/searchable table (§5.1) replacing the current flat table, with tabs derived from the same 5 role-tier groups used for the cards (not all 10 individual roles — 10 tabs would be worse UX than the reference's 3, and worse than AOC's own current 0).
- **Do not** add a generic "Access: Full Access / Read-Only / Limited Admin" column like the reference — that implies a coarser permission model than AOC's actual named-permission system, and would misrepresent what a role can really do. If a per-account access-level display is wanted, it should read the account's actual permission set from `PERMISSIONS`, not a fabricated 3-tier label.
- Status column: `Enabled`/`Disabled` badge exactly as already implemented (`is_active` boolean → emerald/slate badge), not the reference's differently-styled toggle.

### 11.3 Permission-gated UI elsewhere

Every page that renders a mutating action (New Lead, Delete, Approve PO) should check `hasPermission(userRole, PERMISSION)` before rendering the control, not just rely on the server throwing `FORBIDDEN` — hiding controls the user can't use is both better UX and reduces confusing error toasts. This is a **gap in some existing pages today** (server-side RBAC is consistently enforced via `authorizedProcedure`; client-side hiding is inconsistent) — worth an audit pass separate from this doc.

---

## 12. Responsive behavior

- **Breakpoints:** Tailwind defaults (`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px). No custom breakpoints defined.
- **Sidebar:** does not auto-collapse on smaller viewports today — it's a manual user toggle only. **Gap:** below `lg`, the fixed 224px sidebar meaningfully eats into content width on a laptop-class screen; a `lg:` auto-collapse default (still user-overridable) is worth adding but is a behavior change, not just styling — flag for a follow-up decision rather than silently changing default state.
- **Stat grids:** `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` — the canonical responsive card-grid pattern; reuse this exact sequence (2 → 3 → 6) for any new KPI row rather than inventing a different step sequence.
- **Content grids:** `grid-cols-1 lg:grid-cols-2` (dashboard's two-column panels) → extend to `lg:grid-cols-3` for the new role cards (§4.3).
- **Tables:** no responsive collapse pattern exists (no card-view-on-mobile fallback) — tables scroll horizontally on narrow viewports via the parent's natural overflow. This matches "operator tool, not consumer app" — acceptable, don't over-engineer a mobile card view unless a real mobile-usage requirement shows up (there is a separate `apps/mobile` Expo app in this monorepo for that case).
- **Topbar:** search box and "Ask AI" label collapse via `hidden sm:flex` / `hidden sm:inline` — icons remain, labels drop first. Follow this label-before-icon collapse order for any new topbar control.

---

## 13. Loading, empty & error states

| State | Pattern |
|---|---|
| **Table loading** | Content card with 4 shimmer bars of decreasing width (`80%, 70%, 60%, 50%`), `h-4 bg-slate-100 animate-pulse rounded` — not a spinner, not a skeleton table (no fake header/rows), just proportional bars. |
| **Stat card loading** | `h-8 w-20 bg-slate-100 animate-pulse rounded-md` in place of the value only — label and icon render immediately since they're static. |
| **Table empty** | Centered text in a content card, `py-16 text-center text-sm text-slate-400`: `"No {items} yet. {call to action}."` — always offer the next action in the same sentence, don't just state absence. |
| **Form/mutation error** | `text-red-600 text-sm` line above the form (§6) — never a toast for form-level errors; toasts (if introduced) should be reserved for background/async events, not direct user-action feedback which needs to stay visible until corrected. |
| **AI extraction failure** | Honest inline message on the record itself (`ai_error` text below the status badge, `text-xs text-slate-500` or matching the failed-badge's red at reduced weight) — never silently blank, never a fake success. This is a hard rule established by the DWG-extraction fix: a format the AI can't read must say so specifically, not retry-loop or show empty results. |
| **Page-level error** | Not yet standardized — no existing page has a full-page error boundary UI. **Gap to fill:** define a `max-w-md mx-auto text-center py-24` pattern with an icon, one-line explanation, and a retry/back action, matching the empty-state's tone (helpful, specific, one clear next step) rather than a generic "Something went wrong." |

---

## 14. Reusable component inventory

**What exists** (`components/ui/`): `Tooltip`, `MultiSelectFilter`. That's it — everything else (buttons, cards, tables, badges, inputs) is inline Tailwind repeated per page, not extracted components.

**Implementation criteria for any new shared component:**
1. Match an existing pattern documented in §§4–9 exactly — a new `Button` component must produce byte-identical output to the current inline primary-button classes, not a "close enough" reinterpretation.
2. Accept `className` and merge via `cn()` ([lib/utils.ts](../apps/web/lib/utils.ts)) so call sites can extend, never fully override, spacing/layout.
3. Ship with the accessibility requirements from §10 built in (icon-only variants require `aria-label`, focus-visible ring included by default, not opt-in).
4. Land as `components/ui/{name}.tsx`, colocated with `Tooltip` and `MultiSelectFilter` — don't create a parallel `components/shared/` or similar.

**Recommended extraction order** (highest-repetition, lowest-risk first) — not required by this task, but the natural next step once someone picks this up:
1. `<StatusBadge status={} colorMap={} />` — used identically on 10+ pages already.
2. `<DataTable columns={} rows={} onRowClick={} />` — the exact table shape in §5 appears near-verbatim on every list page.
3. `<Modal>` — the overlay+panel shell in §6.
4. `<Button variant="primary|secondary|ghost|ai" />` — codifying §9.
5. `<StatCard />` — §4.2, currently a bespoke component only on the dashboard; would let other pages (e.g., a "Purchase" summary row) reuse it.

Extracting these is a code change and out of scope for this document — this inventory exists so the next implementation pass has a prioritized, evidence-based list instead of guessing what to componentize first.

---

## 15. What NOT to copy from the reference screenshot

For clarity, since this doc is explicitly "inspired by, not copied from" that image:

- **Stock-photo avatars** — AOC has no avatar-upload feature; keep initials-in-gradient-circle everywhere a person is represented.
- **The 3-tier Access column** (Full Access/Read-Only/Limited Admin) — misrepresents AOC's real 24-permission model (§11.2).
- **Purple/violet as the primary brand accent** — reference uses blue for primary actions too, which does match AOC, but its sidebar is light — AOC's is dark, and that inversion stays.
- **Generic "Manage" per role card without a name** — AOC's cards should say what tier they manage ("Manage Leadership") since 10 real roles collapse into 5 named tiers, not 3 anonymous buckets.
- **Rounded search bar + separate notification/settings icon cluster** floating independent of a breadcrumb trail — AOC's breadcrumb-first topbar is more page-identity-aware and should stay the anchor, with search/AI/notifications as secondary right-aligned actions, exactly as already built.
