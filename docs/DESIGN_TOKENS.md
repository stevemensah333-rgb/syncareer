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
| `--background` | cool near-white workspace canvas | `216 33% 98%` |
| `--card` / `--popover` | white content surfaces | `0 0% 100%` |
| `--foreground` | dark navy-charcoal text | `222 26% 15%` |
| `--primary` | cobalt primary actions | `221 83% 53%` |
| `--secondary` | quiet blue-slate secondary surface | `216 24% 95%` |
| `--success` | teal-mint progress/success | `166 70% 36%` |
| `--warning` | restrained amber attention/deadline | `38 90% 42%` |
| `--danger` / `--destructive` | accessible red errors | `0 72% 51%` |
| `--info` | lavender contextual guidance | `258 62% 50%` |
| `--accent` | soft lavender contextual fill | `252 55% 96%` |
| `--border` / `--input` | quiet cool neutral borders | `218 22% 89%` / `218 22% 84%` |
| `--ring` | cobalt keyboard-focus ring | `221 83% 53%` |

`--info` is exposed as the Tailwind `info` color for badges/alerts; `--accent`
is a pale contextual lavender surface. Generic navigation and row hovers use
muted/sidebar surfaces rather than lavender.

## Application shell

- **Shared shell:** `AuthenticatedLayout` owns the fixed global bar, responsive
  content geometry, page header, and mobile navigation. `StudentLayout` and
  `CounsellorLayout` supply only their role-specific navigation model.
- **Desktop:** the full-height `AppSidebar` owns Syncareer branding and all
  signed-in navigation (`w-64` expanded, `w-[68px]` collapsed). The top bar is
  offset by the rail and contains only counselling/help, notifications, and
  profile/account controls. Active destinations get `bg-primary/10
  text-primary`, a left indicator, and `aria-current`.
- **Mobile:** `MobileBottomNav` (`md:hidden`) derives from the same canonical
  role navigation groups as desktop. Three primary destinations remain visible
  and every remaining destination is reachable from "More". Targets are at
  least 44px high and use `min-w-0` so narrow labels cannot push controls off
  screen.
- **Page header:** shared `PageHeader` (compact title + optional breadcrumb
  trail + optional actions). Empty titles render nothing so pages like
  Dashboard that own their greeting stay clean.
- **Content:** `max-w-[1440px]` gutter container with responsive
  `px-4 sm:px-6 lg:px-8` padding and compact `py-5 lg:py-6` rhythm.
- **Canvas:** `.workspace-shell` is a flat cool near-white canvas with crisp
  white working surfaces. `.app-canvas` remains available to public/editorial
  surfaces and is not used by the authenticated shell.
- **Surfaces:** shared cards use a quiet border and no default shadow. Dialogs,
  sheets, popovers, and toasts retain shadows because they represent elevation.
  `workspace-panel` and `workspace-row` provide explicit dense panel/list
  treatments without introducing another component library.

## Interaction & accessibility

- All motion uses ~120–180ms transitions (`duration-150`).
- Dialogs and destructive confirmations fade without scale/zoom; sheets use a
  150ms directional transition. Shared scroll reveal is limited to 150ms and an
  8px offset.
- Visible keyboard focus: Radix/shadcn widgets draw their own `ring`; a global
  `:focus-visible` outline covers every other interactive element.
- `prefers-reduced-motion` collapses animations/transitions to near-instant
  globally.
- Skip links, `aria-current` on active nav, `aria-expanded` on the collapse
  control, and accessible labels on icon-only controls are used throughout the
  shell.
- Operational workspace typography is the established Inter/sans stack.
  Decorative serif styling remains scoped to public/editorial surfaces.

## Authentication and onboarding shells

Authentication routes use the same `app-canvas`, sans-serif type, semantic
colours, 8–12px radii, quiet borders, and 150ms interaction rhythm as the
application. Onboarding uses a flat `--background` workspace canvas, the same
compact Syncareer identity treatment, standard bordered cards, and the shared
form controls. Both intentionally avoid the landing-page cream/amber palette,
decorative serif or italic headings, blurred ornaments, pill-shaped marketing
cards, and marketing motion.

Onboarding is a two-step welcome → role-specific profile flow. Progress is
explicit, previously saved details are restored before editing, and the form
uses the canonical `student` / `career_counsellor` role supplied at signup; it
does not offer client-side privileged role reassignment. Initial-load and save
failures remain visible with a retry path instead of leaving the user on a
spinner or an empty surface.

Auth feedback stays visible inline: pending buttons retain an action-specific
label, errors use `destructive`, confirmation uses `success`, and expired-link
guidance uses `warning`. Password visibility is a named, keyboard-reachable
button; fields keep browser-compatible labels, names, and autocomplete values.
