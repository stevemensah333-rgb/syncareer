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

## One system, three layers

`src/index.css` is organised as:

1. **Global semantic tokens** (`:root` / `.dark`) — colour, geometry, spacing.
2. **Shared primitives** — `.type-*`, `.surface-*`, `.page-*`, state classes.
3. **Product patterns** — dossier styling, scoped and opt-in.

Landing, authentication, onboarding, and the authenticated workspace all
consume the *same* layer 1 and 2. No page defines its own palette, type scale,
or radii.

## Semantic palette (light)

| Token | Role | Hue |
|---|---|---|
| `--background` | pale blue-grey workspace canvas | `216 33% 97%` |
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
| `--border-subtle` | quieter divider / nested surface edge | `218 20% 93%` |
| `--ring` | cobalt keyboard-focus ring | `221 83% 53%` |
| `--primary-hover` | primary action pressed/hover | `221 78% 46%` |
| `--selected` | selected row/object fill | `221 55% 95%` |
| `--error` | alias of `--destructive` | `0 72% 51%` |

### The sixteen semantic roles

Every surface in the product may use exactly these roles. Each named alias is a
`var()` reference to the palette value above, so a role can never drift from the
colour it names.

| Role | Token | Tailwind |
|---|---|---|
| application canvas | `--canvas` | `bg-canvas` / `bg-background` |
| primary surface | `--surface` | `bg-surface` / `bg-card` |
| secondary surface | `--surface-secondary` | `bg-surface-secondary` / `bg-secondary` |
| elevated / focused surface | `--surface-elevated` | `bg-surface-elevated` / `bg-popover` |
| primary text | `--text` | `text-foreground` |
| secondary text | `--text-secondary` | `text-foreground-secondary` |
| muted text | `--text-muted` | `text-muted-foreground` |
| border | `--border` | `border-border` |
| subtle border | `--border-subtle` | `border-border-subtle` |
| brand | `--brand` | `bg-brand` / `text-brand` |
| brand hover | `--brand-hover` | `bg-brand-hover` |
| selected | `--selected` | `bg-selected` / `text-selected-foreground` |
| success | `--success` | `bg-success` / `text-success` |
| warning | `--warning` | `bg-warning` / `text-warning` |
| error | `--error` | `bg-error` / `text-error` |
| informational | `--info` | `bg-info` / `text-info` |

`--brand` is `var(--primary)`: the cobalt action colour *is* the Syncareer brand
colour. The separate name exists so chrome and brand marks can say "brand"
without reading as "the default button variant". `--foreground-secondary` is a
retained alias of `--text-secondary`. Other retained aliases: `bg-error`,
`bg-primary-hover`.

`--info` is exposed as the Tailwind `info` color for badges/alerts; `--accent`
is a pale contextual lavender surface. Generic navigation, menus, and row
hovers use muted/selected surfaces rather than lavender.

## Typography scale

| Class | Use |
|---|---|
| `.type-display` | hero / marketing headline |
| `.type-page-title` | page `h1` |
| `.type-section-title` | section `h2`/`h3` |
| `.type-body` | default reading text |
| `.type-secondary` | supporting text |
| `.type-meta` | metadata, timestamps, counts |
| `.type-label` | form labels and quiet eyebrows (sentence case) |

Uppercase micro-labels are limited to `.eyebrow` (and its alias
`.dossier-eyebrow`), which is reserved for document/dossier surfaces.

## Geometry

| Token | Applies to | Value |
|---|---|---|
| `--radius-control` | buttons, tabs, menu items | `0.375rem` |
| `--radius-input` | inputs, selects, textareas | `0.375rem` |
| `--radius-surface` | cards, panels, popovers | `0.5rem` |
| `--radius-surface-lg` | large Discover objects | `0.75rem` |
| `--radius-overlay` | dialogs, sheets, drawers | `0.625rem` |
| `--radius-document` | dossier / document surfaces | `2px` |
| `--radius-pill` | badges, avatars, progress only | `9999px` |

Exposed to Tailwind as `rounded-control`, `rounded-input`, `rounded-surface`,
`rounded-surface-lg`, `rounded-overlay`, `rounded-document` and `rounded-pill`.
Prefer these over ad-hoc `rounded-2xl` etc. Do not use pill radii on buttons,
inputs, cards, or panels.

Checkboxes use `rounded-sm` (`calc(var(--radius) - 4px)`): `--radius-control` is
too round on a 16px box. Radios, switches, badges, avatars, progress bars and
status dots use `rounded-pill`.

## Surfaces & elevation

Three levels only:

- `.surface-canvas` — the flat page/workspace background.
- `.surface-content` — the default bordered content surface, **no shadow**.
- `.surface-raised` — genuine elevation.

`boxShadow` is reduced to `shadow-card` (hairline) and `shadow-overlay`
(overlays). Glassmorphism, neomorphic, and blur ornament utilities were
removed. Colour gradients are not used for surfaces.

## Spacing

`--page-max-width` (1440px) with `--page-gutter{,-sm,-lg}` and
`--page-block{,-lg}`, applied through `.page-container` / `.page-block`. The
authenticated shell, and any full-width public surface, use these rather than
repeating `mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8`.

Numeric scale: `--space-1` (4px) through `--space-16` (64px), plus
`--control-height` (40px), `--control-height-sm` (36px), `--control-height-lg`
(44px), and `--touch-min` (44px).

Control heights are exposed to Tailwind so a button, input, select, tab list and
toggle on the same row are guaranteed to line up:

| Utility | Token | Use |
|---|---|---|
| `h-control` / `w-control` | `--control-height` | default buttons, inputs, selects, tab lists, icon buttons |
| `h-control-sm` | `--control-height-sm` | compact buttons and toggles, overlay close buttons |
| `h-control-lg` | `--control-height-lg` | large buttons and toggles |
| `min-h-touch` | `--touch-min` | any target reachable on touch (mobile nav) |

Layout primitives (structural, not a second visual theme):

| Class | Use |
|---|---|
| `.page-container` | public and shared page width |
| `.workspace-container` | authenticated workspace width (`--workspace-max-width`) |
| `.layout-section` | vertical section stack using `--mode-section-gap` |
| `.layout-toolbar` | compact action/filter row |
| `.layout-side-panel` | supporting column |
| `.layout-content-panel` | primary working column |
| `.layout-contextual-panel` | preview / guidance column (panel-length motion) |
| `.mode-object` | object radius from the active mode |

## Discover / Prove / Advance

Opt-in wrappers retune density and geometry — they do not re-theme colour.

| Class | Geometry | Density |
|---|---|---|
| `.mode-discover` | `--radius-surface-lg` objects | spacious (`--space-6` sections) |
| `.mode-prove` | `--radius-document` objects | dense (`--space-4` sections) |
| `.mode-advance` | `--radius-surface` objects, 56rem workspace | focused (`--space-5` sections) |

Do not wrap every screen in the same mode. Prove keeps the dossier pattern;
Discover and Advance must not become documents.

## Iconography

`lucide-react` is the single icon system, at its default 24px viewBox and
`stroke-width="2"` — never restroked per call site. Use Tailwind `size-*`, never
an `h-`/`w-` pair:

| Utility | Use |
|---|---|
| `size-3` | dense status dots, inline refresh affordances |
| `size-3.5` | badges, dense metadata rows, compact buttons |
| `size-4` | **default** — buttons, inputs, list rows, navigation |
| `size-5` | section headers and standalone affordances |
| `size-6` | empty-state and status illustrations |

Buttons, badges and alerts force their own icon size (`[&_svg]:size-4`,
`[&_svg]:size-3`), so callers must not re-specify it. Icons are inline-flex
siblings with `shrink-0`, so they cannot be squeezed by a truncating label.
Decorative icons carry `aria-hidden="true"`; an icon-only control carries an
`aria-label` instead.

## Shared control system

One implementation per control, in `src/components/ui/`. `designSystem.test.tsx`
and `tokenConsumption.test.ts` lock the shared vocabulary; a control that
diverges fails the suite.

| Control | Radius | Height | Surface |
|---|---|---|---|
| Button / IconButton | `rounded-control` | `h-control` (`-sm` / `-lg`, square for icon) | variant |
| Input, Textarea | `rounded-input` | `h-control` | `bg-card` |
| Select trigger | `rounded-input` | `h-control` | `bg-card` |
| Checkbox | `rounded-sm` | `size-4` | `border-primary` |
| Radio | `rounded-pill` | `size-4` | `border-primary` |
| Switch | `rounded-pill` | `h-6 w-11` | `bg-input` unchecked |
| Tabs list / trigger | `rounded-control` / inset | `h-control` | `bg-muted` / `bg-card` |
| Toggle | `rounded-control` | `h-control` (`-sm` / `-lg`) | `bg-selected` when on |
| Badge | `rounded-pill` | intrinsic | variant (`soft-*` for inline status) |
| Menu / select item | `rounded-control` | intrinsic | `focus:bg-muted` |
| Dialog, Sheet, Drawer, Popover, Tooltip, Toast | `rounded-overlay` / `rounded-surface` | — | `bg-card` / `bg-popover` |
| Progress | `rounded-pill` | `h-4` | `bg-secondary` track |
| Skeleton | `rounded-control` | intrinsic | `bg-muted` |

Every control shares: `focus-visible:ring-2 ring-ring ring-offset-2` (never a
bare `focus:` ring, so mouse clicks do not draw a ring), `duration-150
ease-standard`, `motion-reduce:transition-none`, `disabled:opacity-50` with
`pointer-events-none` where the control can still receive pointer events, and
`aria-invalid:border-destructive` on text entry. Hover and focus land on
`--muted` / `--selected`, never on lavender `--accent`. Overlay motion is
opacity and transform only — dialogs fade, they do not scale; drawers never
scale the page (`shouldScaleBackground = false`).

Text inputs, selects and textareas all sit on `bg-card`. They used to disagree
(`Input` white, `Select`/`Textarea` canvas-tinted), which made the same form
render two different field surfaces.

**Status colour lives in `Badge`.** Application status is rendered with
`STATUS_BADGE_VARIANT` → `soft-warning` / `soft-primary` / `soft-neutral` /
`soft-success` / `soft-destructive` / `success`. The previous `STATUS_COLORS`
map was a page-local palette of raw `bg-*` / `text-*` strings and is gone;
`MentorshipRequests` and `NotificationItem` hand-rolled the same idea and now
use `Badge` too.

**One busy indicator.** `Spinner` (`ui/spinner.tsx`) is the only generic loading
animation. It is decorative (`aria-hidden`) by default so an inline spinner
inside a button does not announce "Loading" on top of the button's own label;
callers pass `role="status"` and a label when it stands alone. The five
hand-rolled CSS border-ring spinners (`LoadingFallback`, `AdminRoute`,
`RoleRoute`, `NotificationsDropdown`, `Analysis`) and 33 `<Loader2 …
animate-spin>` call sites now use it. A `RefreshCw` that spins while refetching
is *not* a generic spinner and stays, but it must carry
`motion-reduce:animate-none` like everything else that animates.

## States

`.interactive` supplies the shared hover / active / focus vocabulary to bespoke
clickable rows and tiles (5 call sites). The rest is shared vocabulary for
bespoke rows, cards and tiles that cannot use a primitive: `.is-selected` (left
rule + `--selected` tint), `.is-pressed`, `.is-disabled`, `.is-loading`,
`.is-error`, `.is-warning`, `.is-success`. Radix/shadcn controls implement all
nine natively; prefer a primitive over an `is-*` class.

Icon-only actions use `Button size="icon"` or `IconButton`, and must carry an
`aria-label`.

Motion tokens: `--motion-fast` 120ms, `--motion-base` 150ms, `--motion-slow`
180ms, `--motion-panel` 200ms, `--ease-standard` `cubic-bezier(0.2, 0, 0, 1)`.
Tailwind: `duration-150`, `duration-fast`, `duration-panel`. No spring easing;
`prefers-reduced-motion` collapses motion globally.

**One easing curve.** Tailwind's built-in `ease-out` keyword is
`cubic-bezier(0, 0, 0.58, 1)` — a different curve from `--ease-standard`. Shared
controls therefore use the `ease-standard` utility, and the built-in
`animate-*` entries in `tailwind.config.ts` reference `var(--motion-*)` and
`var(--ease-standard)` rather than hard-coded values. `tokenConsumption.test.ts`
fails if `ease-out` reappears outside `components/ui/`.

Shared motion classes: `.route-enter` (page continuity), `.interview-question-enter`
(question change), `.cv-section-body` (section expand via `grid-template-rows`),
`.state-saved` (success flash), `.dossier-inspector-enter`, `.dossier-flash`,
`.scroll-reveal` (CSS `animation-timeline: view()` when supported, 8px rise).
Hover lift on Discover objects is limited to `(hover: hover) and (pointer: fine)`
and 1px — never the only way to act. Drawers do not scale the page background.

## Legacy primitives left in place

These `ui/` files have **no importer outside `components/ui/`** and were not
migrated or deleted in the token work (removal is a separate, approved step).
They still carry pre-token styling — `rounded-md`, `duration-100`/`duration-200`,
`focus:` rings — so they are excluded from the control-system tests:

`button-group` · `calendar` · `carousel` · `chart` · `collapsible` · `command` ·
`context-menu` · `empty` · `field` · `form` · `input-group` · `input-otp` ·
`item` · `kbd` · `menubar` · `navigation-menu` · `pagination` · `resizable` ·
`separator` · `slider`

Aligned anyway, because they are reachable from a shared component or named in
the control inventory: `accordion` (one page), `breadcrumb` (one page),
`hover-card` (via `contextual-preview`), `drawer`, `toggle`, `toggle-group`.

`scroll-area` and `table` each have one importer and are data/layout primitives
rather than controls, so they were left as-is. `input-otp`, `item` and
`navigation-menu` are the only remaining files carrying off-scale durations
(`duration-100`, `duration-200`); they are unused, and the motion tests scope
themselves to code that ships.

`body.compact-view` is **removed** (2026-09-04): it was a Settings toggle wired
to global `[class*="CardHeader"]` overrides, which bypassed the surface
primitives instead of using them. Density now comes from `.workspace-row` /
`.surface-content` alone, so there is no page-wide styling exception left in
`index.css`.

## Dossier rule

The dossier is a **product pattern, not the brand**. It no longer re-themes the
authenticated shell — `.workspace-shell` inherits the single global palette.
What remains dossier-specific is *pattern*, not palette: 2px document geometry,
the Literata document title face (`.dossier-title`), rule-line sections, and the
evidence washes (`--dossier-*-wash`, derived from the global palette).

Apply it to: applications, requirements, evidence, application review, and
application-specific CV tailoring.

Do **not** apply it to: landing, dashboard, assessment, interview practice,
opportunities, mentors. `PageHeader` therefore defaults to
`variant="operational"`; document typography is opt-in via
`headerVariant="document"` on `PageLayout` / `StudentLayout` /
`CounsellorLayout`.

`src/components/dossier/dossierScope.test.ts` locks this boundary in.

## Application shell

The authenticated shell is one environment, not a stack of templates: the
canvas is the environment, the navigation rail and top bar sit directly on it,
and white surfaces inside it are purposeful work areas.

- **Shared shell:** `AuthenticatedLayout` owns the fixed global bar, responsive
  content geometry, page header, and mobile navigation. `StudentLayout` and
  `CounsellorLayout` supply only their role-specific navigation model.
- **Navigation model:** student destinations are grouped conceptually —
  **Workspace** (Home, Opportunities, Applications), **Build** (CV Builder),
  **Practice** (Interview), **Connect** (Mentors) — and every href is a real
  route. Contextual destinations (assessment, analysis, mentorship requests,
  settings) stay inside their workflows and the account menu.
- **Desktop:** the full-height `AppSidebar` owns Syncareer branding and all
  signed-in navigation (`w-64` expanded, `w-[68px]` collapsed). The rail is
  canvas-coloured with a hairline `--sidebar-border`, never a white panel.
  Active destinations get the `--selected` tint, `--selected-foreground` text,
  a primary left rule, and `aria-current`; the owning group label turns
  primary. Hover uses `--sidebar-accent`.
- **Collapse:** the rail collapses on desktop only. The state persists across
  navigation and reloads (`useSidebarCollapsed`, localStorage) because the
  layout remounts per route. Collapsed, labels stay in the accessibility tree
  (group labels become `sr-only`), icons centre with `title` tooltips, and the
  toggle keeps `aria-expanded`.
- **Top bar:** canvas-coloured with a hairline bottom border. It carries the
  persistent location context — the page's explicit breadcrumb trail, or a
  derived `group / destination` trail from the navigation model (so context
  survives scrolling and sub-routes like an application dossier) — plus
  notifications and the account menu. Mobile shows the brand instead; location
  is already stated by the bottom nav. Nothing else is added to fill space.
- **Mobile:** `MobileBottomNav` (`md:hidden`) is the single global navigation
  pattern, derived from the same canonical groups. Up to four destinations fit
  as tabs; beyond that the bar keeps the primary three and moves the rest into
  a bottom-sheet "More" (grouped, keyboard-accessible, 150ms slide). Targets
  are at least 44px high and use `min-w-0` so narrow labels cannot push
  controls off screen. The full sidebar is never shown alongside it, and
  contextual navigation lives inside feature workflows.
- **Page header:** shared `PageHeader` renders the title (plus optional
  description and actions) directly on the canvas; breadcrumbs live in the top
  bar. Empty titles render nothing so pages like Dashboard that own their
  greeting stay clean.
- **Content:** `max-w-[1440px]` gutter container with responsive
  `px-4 sm:px-6 lg:px-8` padding and compact `py-5 lg:py-6` rhythm.
- **Canvas:** `.workspace-shell` is the flat pale blue-grey canvas. Chrome
  (rail, top bar) and page background share it; white `--card` surfaces float
  in it as work areas. `.app-canvas` is a legacy alias of `.surface-canvas` —
  there is one canvas treatment across the product.
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

Authentication routes use the same canvas, sans-serif type, semantic colours,
shared radii tokens, quiet borders, and 150ms interaction rhythm as the
application. `AuthShell` and `OnboardingShell` use `.type-page-title` and
`.surface-content` rather than document styling. Onboarding uses a flat `--background` workspace canvas, the same
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
