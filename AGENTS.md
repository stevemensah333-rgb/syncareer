# Syncareer engineering instructions

## Product purpose

Syncareer helps African university students and recent graduates turn real opportunities into stronger, evidence-based applications.

The primary product journey is:

> saved opportunity → application workspace → tailored CV → interview preparation → application outcome → learning

Prefer depth and continuity around this journey over adding disconnected tools.

## Product and repository

- The active frontend currently builds from `artifacts/syncareer`. Do not remove an application directory merely because its name contains `artifacts`; confirm imports, routes, build inputs, and runtime use first.
- The backend is Supabase Auth, Postgres/PostgREST/RLS, database functions, and Supabase Edge Functions. Do not assume an Express server exists unless the repository later contains and uses one.
- The current hosted backend was created and is managed as Lovable Cloud. Its Supabase-style project reference is not proof that the developer's personal Supabase account has Dashboard or Management API ownership.
- Lovable intentionally remains part of the operating workflow. It provides useful Supabase integration, OAuth, AI gateway, email/webhook, analytics/SEO, deployment, and non-technical-founder conveniences where verified.

## Product boundaries

- The core application must remain understandable without knowledge of Lovable internals.
- Keep business and domain logic separate from vendor integration details when a real integration seam exists.
- Do not create abstractions solely to make every vendor theoretically replaceable.
- Do not add speculative features, fake data, fake activity, fake testimonials, fake partners, invented outcome statistics, or unverifiable marketing claims.
- Do not introduce generic AI chat surfaces when contextual assistance inside an existing workflow is sufficient.
- Do not copy CareerOS, FlyRank, Supabase, Anthropic, Vercel, Linear, or any other product. Design references may inform principles, not wording, layouts, branding, or distinctive compositions.

## Read before changing

- Inspect the current files and call sites before recommending or making changes. Do not rely on historical docs alone.
- Treat `docs/archive` as historical, not authoritative.
- When code, generated types, migrations, docs, and live-platform behavior disagree, stop and identify the sources of truth. Do not guess.
- For Supabase schema or deployed-function work, distinguish repository evidence from live-project evidence.

## Engineering priorities

- Human maintainability is the highest priority. A competent engineer must be able to understand, test, debug, and extend the codebase without knowing the prompts or AI tools that created it.
- Prefer simple modules, explicit business logic, obvious data flow, strong database constraints, focused tests, and clear integration boundaries.
- Treat unnecessary complexity as a defect.
- Do not introduce microservices, CQRS, event buses, generic repositories, dependency-injection frameworks, speculative caching, provider-neutral frameworks, or abstractions with one implementation unless a demonstrated problem requires them.
- Do not introduce an abstraction merely to avoid a few duplicated lines.
- Do not rewrite working domains when a targeted repair is safer.

## Lovable compatibility

Lovable remains intentionally part of Syncareer's operating workflow. Do not treat all Lovable-specific code as residue.

Before removing or restructuring a Lovable-specific artifact, classify it as:

1. `ACTIVE PLATFORM DEPENDENCY`
2. `USEFUL INTEGRATION`
3. `HISTORICAL COMPATIBILITY`
4. `GENERATED CODE DEBT`
5. `UNKNOWN`

- Do not remove categories 1, 2, or 5 without explicit approval.
- Verify current usage, the capability supported, and the operational effect of removal.
- If safety cannot be determined from repository evidence, classify the artifact as `UNKNOWN` and stop before removal.
- Preserve useful Lovable capabilities, including existing Supabase integration, database workflow, analytics/integrations, SEO conveniences, email/webhook or AI gateway integrations, and other confirmed operational infrastructure.
- Keep Lovable-specific concerns near real integration seams such as OAuth, AI gateway, email, webhooks, generated Supabase files, or deployment configuration.
- Keep core Syncareer domain code understandable without knowledge of Lovable internals.
- Do not add vendor-neutral adapters unless there is a real integration seam with meaningful application logic to isolate.

## Supabase and security

- The existing Supabase project was created and may be managed through Lovable.
- Do not assume the local operator can run `supabase link`.
- Do not relink, replace, reset, migrate, seed, or modify a remote Supabase project unless explicitly authorised.
- Never expose service-role keys or secrets in browser code, logs, documentation, commits, or generated output. Never expose or log payment secrets, Lovable API keys, webhook secrets, or user tokens either.
- Browser `VITE_*` values may be public configuration, but do not move server secrets into them.
- Preserve existing authentication, RLS, storage, Edge Functions, migrations, and schema integration unless the task explicitly requires a verified change.
- Database changes require an explicit migration, rollback explanation, and verification plan. Do not apply them remotely without approval.
- Treat browser route guards as UX only. Authorization must be enforced by RLS, database constraints/functions, or authenticated Edge Functions.
- Never weaken RLS, grants, trigger protections, payment verification, usage enforcement, or role checks to make a test pass.
- Do not edit or reconstruct deployed-only Edge Functions from frontend call sites. Recover exact deployed source first.
- Do not hand-create a database baseline from generated TypeScript types. Reconcile against the live schema first.
- Do not run `supabase link`, `db pull`, `db push`, `migration repair`, function deployment, or other remote Supabase CLI commands against the Lovable Cloud project unless direct ownership/access is deliberately established and the exact operation is separately approved.
- Use Lovable Cloud and its supported GitHub synchronization/export surfaces as the current hosted-backend authority. Treat migration to a developer-owned Supabase project as a separate future migration project, not routine cleanup.
- Every billable AI or payment operation must enforce access server-side. Client checks are not security controls.
- Payment verification must confirm provider status, amount, currency, plan, user ownership, and replay/idempotency before granting access.

## Retired platform artifacts

Replit is no longer part of the intended workflow. Legacy Replit artifacts may still be wired into the repository, so Replit-specific files, configuration, and dependencies may be removed only after confirming that no active build, runtime, deployment, or documentation path uses them.

Examples include `.replit`, `.replitignore`, `replit.md`, `.replit-artifact`, and `@replit/*`.

Do not remove an entire application directory merely because its name contains `artifacts`. Confirm imports, routes, build inputs, and runtime use first.

## Interface direction

The signed-in product should feel like active, credible software rather than a sparse marketing site or generic AI dashboard.

Use these principles:

- bright, calm working surfaces;
- compact but readable information density;
- clear hierarchy and predictable placement;
- persistent navigation on desktop;
- progressive disclosure;
- contextual side panels or previews where they preserve user context;
- visible next actions;
- explicit loading, empty, success, warning, and error states;
- restrained motion;
- accessible keyboard and touch behaviour;
- responsive layouts that do not depend on hover.

Visual influences may include:

- CareerOS for useful density, interconnected career objects, and progressive disclosure;
- Supabase for transparent system states and functional cards;
- Vercel for spacing and interface precision;
- Anthropic for warmth and typography;
- Linear for interaction consistency and keyboard-friendly workflows.

Do not copy their visual identities.

### Suggested visual tokens

Treat these as direction rather than a requirement if an established token system already exists:

- canvas: warm near-white;
- surface: white;
- text: dark navy-charcoal;
- primary: cobalt;
- positive/progress: teal or mint;
- attention/deadline: restrained amber;
- guided assistance: occasional soft lavender;
- borders: quiet neutral;
- errors: accessible red.

Use semantic design tokens rather than scattering raw colours through components.

## Interaction rules

- Hover effects must communicate interactivity or reveal useful secondary context.
- Anything available on hover must also be reachable by keyboard and touch.
- Essential actions must never exist only on hover.
- Prefer approximately 120–180ms transitions.
- Avoid excessive scaling, glowing gradients, animated AI sparkles, decorative motion, and large layout shifts.
- Tooltips are for short explanations. Rich previews are for structured contextual information.
- Use one consistent card-preview pattern rather than unrelated hover implementations.

## Syncareer Product & Interface Doctrine

This doctrine governs product design and interface work. It sits **alongside**
the engineering, security, Supabase, Lovable, and testing policy above and does
not replace any of it. Where a design idea conflicts with a security,
data-truthfulness, or maintainability rule, the engineering policy wins.

### Product definition

Syncareer is a **career operating environment**, not a tool collection. Every
screen belongs to one of three verbs:

- **Discover** — opportunities, companies, mentors, career exploration.
- **Prove** — evidence, requirements, applications, CV, application readiness.
- **Advance** — interview, assessment, skills, feedback, next actions.

Design decisions must strengthen the path `discover → prove → advance`. A change
that adds a screen without connecting career objects is a regression.

Syncareer must not read as a generic AI startup, an AI wrapper, a student CRUD
dashboard, a template SaaS app, a bag of unrelated pages, or a clone of
CareerOS, DataCamp, Coursera, Linear, Vercel, or Supabase.

### Reference principle

External products may be studied for **principles only**: CareerOS for career
density, interconnected objects, and progressive disclosure; DataCamp for a
deliberate token system and information hierarchy; Coursera for progression,
states, and guided workflows. Never copy layouts, colours, wording, branding, or
distinctive visual compositions.

### Visual identity

- A recognisable application canvas: subtle blue/blue-grey environmental
  background, white work surfaces, deep blue/teal brand identity.
- Restrained semantic accents, strong typography, deliberate whitespace,
  moderate geometry, restrained borders, very limited shadows.
- No gratuitous gradients, no glassmorphism, no animated AI decoration, no
  visual noise.
- Distinctiveness comes from composition, interaction, typography, colour
  relationships, visual objects, progression language, and
  application/evidence relationships — never from unusual CSS tricks.
- The token system in `artifacts/syncareer/src/index.css` and
  `tailwind.config.ts` is the single source of truth (see
  `docs/DESIGN_TOKENS.md`). Consume semantic tokens; do not introduce
  page-local palettes, type scales, or radii.

### Three visual modes, one product

| Mode | Surfaces | Character |
|---|---|---|
| **Discover** | Dashboard, Opportunities, Mentors, exploration | spacious, visual, approachable, lighter density, recognisable career objects |
| **Prove** | Applications, requirements, evidence, application review, tailoring | dossier/workspace, precise, information-dense, evidence-first, strong context preservation |
| **Advance** | Interview, Assessment, Skills, development workflows | progressive, interactive, focused, feedback-oriented, clear progression |

All modes share typography, colour, spacing scale, control primitives,
iconography, status semantics, focus states, accessibility behaviour,
responsive behaviour, and motion principles. They must **not** be forced into
identical layouts. **Distinct workspace, same product** is a core rule.

### Dossier rule

The dossier is a signature Syncareer pattern for the Prove mode
(`src/components/dossier/`, `src/features/application-dossier/`). Preserve and
strengthen it, and keep it scoped: Dashboard, Opportunities, Interview,
Assessment, Mentors, and Landing must not become documents. Existing scope
tests (`dossierScope.test.ts`) encode this; keep them passing.

Terminology stays plain: Application, Requirements, Evidence, Progress, Next
step, Activity. Do not invent new vocabulary where an ordinary word works.

### Human design rule

Every visible element must answer at least one of: what does this tell me? what
can I do with it? what state is it communicating? what context does it
preserve? Do not add UI because a component library offers a component, and do
not display data merely because it exists.

### AI principle

AI is embedded intelligence, not the brand. Prefer contextual suggestions,
explanations, recommendations, evidence guidance, and feedback inside the
workflow. Avoid large standalone AI chat panels, AI avatars, sparkle motifs,
repeated "AI-powered" labelling, and other AI clichés.

### Motion principle

Motion communicates cause and effect, hierarchy, continuity, state, progress,
context, and feedback. Keep transitions in the 120–180ms range, respect
`prefers-reduced-motion`, and avoid motion that distracts, blocks interaction,
shifts layout, adds cognitive noise, burns CPU, or feels like a demo.

### Performance principle

Visual quality must not cost responsiveness. Prefer CSS transforms/opacity,
CSS scroll-driven animation where appropriate, lightweight transitions, lazy
loading, reserved image dimensions, and minimal client-side JavaScript for
visual effects. Do not add large animation libraries without a demonstrated
need.

### Accessibility principle

Accessibility is product quality: keyboard access, visible focus, semantic
HTML, sufficient contrast, meaningful labels, touch-friendly targets,
reduced-motion support, and screen-reader compatibility are non-negotiable.

### Responsive principle

Mobile is a deliberate layout, not a compressed desktop. At any viewport there
must be exactly one global navigation mechanism and one contextual navigation
mechanism, no unnecessary horizontal navigation, and no hover-dependent
functionality.

### SEO principle

Public pages are search-friendly; authenticated application pages must not be
unintentionally indexed. Maintain unique titles, useful descriptions, canonical
URLs, semantic headings, Open Graph/social metadata, a sitemap, robots rules,
and structured data only where visible page content supports it. Never fabricate
ratings, testimonials, user counts, partner logos, employment outcomes, success
percentages, ATS-performance claims, search volume, or customer numbers — this
reinforces the existing prohibition on unverifiable marketing claims.

### Engineering principle for interface code

A future engineer must understand the interface without knowing which AI, which
prompt, or which visual reference produced it. Interface code stays
understandable, composable, and maintainable, and follows the same smallest-
coherent-change and verification rules as the rest of the repository.

## TypeScript and validation

- Do not weaken TypeScript compiler options, add blanket ignores, or use broad `any` types or casts to obtain a green typecheck.
- Fix type errors by correcting runtime assumptions, schema drift, or interfaces.
- Validate untrusted data at runtime: form boundaries, Edge Function requests, external APIs, AI output, webhook payloads, and stored JSON where appropriate.
- Generated Supabase types are generated artifacts. Establish their source and regeneration workflow before editing them manually.

## Dependencies and generated code

- Use the repository's confirmed authoritative package manager. Until the package-manager cleanup is complete, do not delete lockfiles solely because they look redundant.
- Before adding a production dependency, verify that the platform or native APIs and current dependencies do not already solve the need.
- Do not manually edit generated files unless the task explicitly establishes that as the supported workflow.
- Preserve Lovable compatibility when it has verified operational value.

## Change discipline

Before changing code:

1. Inspect the relevant routes, components, data flow, tests, and existing conventions.
2. Identify which behaviour is real, mocked, incomplete, or inaccessible.
3. Make the smallest coherent change.
4. Preserve working integrations.
5. Do not silently swallow errors.
6. Do not claim success based only on a build passing.

Additionally:

- Keep each branch and commit focused on one stage or domain.
- Do not combine behavior changes with broad refactoring.
- Preserve unrelated user changes and platform files.
- Do not deploy, merge, rotate secrets, mutate production data, apply remote migrations, modify production infrastructure, or remove live integrations without explicit user authorization.
- For destructive or irreversible work, inspect exact targets and stop for approval.
- If a task is blocked by missing live Supabase/Lovable evidence or credentials, report the exact blocker and required user action instead of inventing a substitute.

## Verification before finishing

- Run the existing frozen-install command.
- Run typecheck.
- Run relevant tests.
- Run the full test suite when practical.
- Run the production build.
- Run database/RLS or Edge Function tests when those areas change.
- Inspect the final diff for accidental generated files, secrets, lockfile churn, unrelated formatting, weakened validation, and unnecessary abstractions.
- Report changed files, exact test commands and outcomes, remaining risks, anything not verified, and any required user action.
- Do not claim success if a required check was skipped or already failing. State whether failures are pre-existing or introduced.

## Documentation

- Update current architecture/runbook documentation when behavior or operating procedures change.
- Do not present archived plans as current architecture.
- Document why a non-obvious integration or security boundary exists, not what obvious code syntax does.
- When an AI session exposes a repeated repository-specific mistake, propose a concise `AGENTS.md` update; do not grow this file with one-off task details.

## Definition of done

- Requested behavior is implemented with the smallest sensible change.
- Relevant tests exist and pass.
- Typecheck and build status are honestly reported.
- Security, RLS, payment, AI-cost, and platform-integration boundaries are preserved.
- Documentation matches the resulting system.
- The final response lists changed files, verification performed, remaining risks, and any user action still required.
