# Syncareer design tokens & application shell

This documents the visual foundation and authenticated application shell. It is
not a copy of any other product's palette or layout — it is Syncareer's own
calm, bright, recognisable surface system.

## Sources of truth

- **Semantic tokens:** `artifacts/syncareer/src/index.css` (`:root` and `.dark`
  HSL variable blocks).
- **Token → Tailwind mapping:** `artifacts/syncareer/tailwind.config.ts`.
- **Shell components:** `artifacts/syncareer/src/components/layout/`.
- **Shared primitives:** `artifacts/syncareer/src/components/ui/`.

## Semantic palette (light)

| Token | Role | Hue |
|---|---|---|
| `--background` | warm near-white canvas | `39 38% 97%` |
| `--card` / `--popover` | white content surfaces | `0 0% 100%` |
| `--foreground` | dark navy-charcoal text | `222 26% 15%` |
| `--primary` | cobalt primary actions | `221 83% 53%` |
| `--secondary` | deep navy-slate secondary actions | `221 22% 30%` |
| `--success` | teal-mint progress/success | `166 70% 36%` |
| `--warning` | restrained amber attention/deadline | `38 90% 42%` |
| `--danger` / `--destructive` | accessible red errors | `0 72% 51%` |
| `--info` | lavender contextual guidance | `258 62% 50%` |
| `--accent` | lavender accent fill/guidance | `255 58% 58%` |
| `--border` / `--input` | quiet neutral borders | `222 20% 89%` / `222 22% 86%` |
| `--ring` | cobalt keyboard-focus ring | `221 83% 53%` |

`--info` is exposed as the Tailwind `info` color for badges/alerts; `--accent`
is reserved for contextual lavender (icons, guidance fills, hovers), so generic
hovers stay calm while guidance reads as lavender.

## Application shell

- **Desktop:** fixed top `Navbar` (`h-16`) + collapsible `AppSidebar` rail
  (`w-64` expanded, `w-[68px]` collapsed). Active destinations get
  `bg-primary/10 text-primary` plus a left indicator bar and `aria-current`.
- **Mobile/tablet:** `MobileBottomNav` (bottom bar, `md:hidden`) with
  ≥44px touch targets (`min-h-11`) and an overflow "More" menu.
- **Page header:** shared `PageHeader` (compact title + optional breadcrumb
  trail + optional actions). Empty titles render nothing so pages like
  Dashboard that own their greeting stay clean.
- **Content:** `max-w-[1400px]` gutter container with responsive `px-4 lg:px-8`
  padding and `py-6` vertical rhythm.
- **Canvas:** `.app-canvas` applies the warm near-white background plus a very
  subtle blue/lavender radial wash to authenticated shells only — the landing
  page keeps its own editorial background.

## Interaction & accessibility

- All motion uses ~120–180ms transitions (`duration-150`).
- Visible keyboard focus: Radix/shadcn widgets draw their own `ring`; a global
  `:focus-visible` outline covers every other interactive element.
- `prefers-reduced-motion` collapses animations/transitions to near-instant
  globally.
- Skip links, `aria-current` on active nav, `aria-expanded` on the collapse
  control, and accessible labels on icon-only controls are used throughout the
  shell.
