# Design tokens

Short reference for the shared primitives. Extend these rather than
hand-rolling a new variant of the same pattern.

## Components

| Component | File | Use for |
|---|---|---|
| `<Button>` | `components/ui/button.tsx` | Every clickable action button. Variants: `primary` (gradient CTA), `secondary` (white/bordered), `danger` (red). Sizes: `md` (default), `sm`. |
| `<Badge>` | `components/ui/badge.tsx` | Every status pill (order status, lead status, invoice status, etc). Tones: `success`, `danger`, `warning`, `info`, `violet`, `indigo`, `orange`, `yellow`, `teal`, `sky`, `neutral`. |
| `<ConfirmDialog>` | `components/ui/confirm-dialog.tsx` | Every delete/destructive confirmation. Includes focus trap (`useDialogA11y`), optional `error` prop for a failed mutation. |
| `inputClass`, `labelClass` | `lib/ui/form-classes.ts` | Every text input / select / label pair in a form. |
| `<NotFoundCard>` | `components/ui/not-found-card.tsx` | Every detail page's "record doesn't exist" state. |

## Adding a new Badge tone or Button variant

Don't hand-roll a new color combination inline. If an existing tone is
close enough, use it. If the app genuinely needs a new semantic color,
add it to the `TONE_CLASSES`/`VARIANT_CLASSES` map in the component file
— that's the only place a raw Tailwind color string for that pattern
should exist.

## Surfaces (already consistent, no shared component needed)

- Card: `bg-white rounded-xl border border-slate-200 shadow-elevation-xs`, padding varies by content density (p-4/5/6, legitimate variation)
- Elevation scale: `shadow-elevation-xs/sm/md/lg` (defined in `app/globals.css`) — always use these over raw Tailwind `shadow-sm`/`shadow-md` for surface elevation. Raw `shadow-sm`/`shadow-md` combined with a colored `shadow-{color}-500/20` is a different, intentional pattern (the primary button's brand-color glow) — that's inside `Button`'s `primary` variant now, don't hand-roll it elsewhere.
- Page heading: `text-xl font-bold text-slate-900 tracking-tight`
- Modal/dialog title: `text-base font-semibold text-slate-900`
- Section label (uppercase, muted): `text-xs font-medium text-slate-500 uppercase tracking-wider`
- Muted/secondary text: `text-slate-500` (do not use `text-slate-400` — fails WCAG AA contrast, fixed app-wide in the accessibility pass)

## What's still ad hoc

Full spacing-scale and typography-scale formalization (a `@theme` token
for every font-size/spacing value in use) wasn't done — the audit found
the existing scale already highly consistent in practice (98% of page
headings, 100% of card surfaces already matched one pattern before this
pass), so the remaining work was extracting the two real duplication
hotspots (buttons, badges) rather than re-deriving a scale that already
existed implicitly. Worth a follow-up if the component library grows
enough that implicit consistency stops holding.
