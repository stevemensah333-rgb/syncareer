# Syncareer engineering instructions

## Product purpose

Syncareer helps African university students and recent graduates turn real opportunities into stronger, evidence-based applications.

Primary journey: **saved opportunity → application workspace → tailored CV → interview preparation → outcome → learning.**

Prefer depth and continuity around this journey over adding disconnected tools.

## Product model

Syncareer is free to use. The product does not use subscription tiers, premium feature gating, or recurring user billing. Optional voluntary one-time support may be offered separately and does not unlock product functionality.

Support payments must never be used as a mechanism for feature access.

## Repository and platform facts

- The application builds from `artifacts/syncareer/` (React 19, TypeScript, Vite, Tailwind, react-router-dom). Root `src/` is Lovable's auto-sync target for generated Supabase files, not a build input. Do not delete a directory merely because its name contains `artifacts`.
- The backend is Supabase Auth + Postgres/PostgREST/RLS + database functions + Edge Functions. There is no in-repo HTTP server.
- The hosted backend is **Lovable Cloud**, which remains an intentional part of the workflow (Supabase integration, OAuth, AI gateway, email/webhooks, analytics, deployment). A Supabase-style project ref is not proof of personal Supabase ownership.
- Replit is retired. Legacy Replit files may be removed only after confirming no build, runtime, deployment, or docs path uses them.
- `docs/archive` is historical, not authoritative. `docs/` holds current architecture, design tokens, test matrix, and runbooks.

## Read before changing

- Inspect current files and call sites before recommending or making changes. Do not rely on docs alone.
- When code, generated types, migrations, docs, and live-platform behaviour disagree, stop and identify the source of truth. Do not guess.
- For schema or deployed-function work, distinguish repository evidence from live-project evidence. If a task is blocked by missing live evidence or credentials, report the exact blocker instead of inventing a substitute.

## Engineering priorities

Human maintainability is the highest priority. A competent engineer must be able to read, test, debug, and extend the code without knowing which AI or prompt produced it.

- Prefer simple modules, explicit business logic, obvious data flow, strong database constraints, focused tests, and clear integration boundaries.
- Treat unnecessary complexity as a defect.
- Make the smallest coherent change. Do not rewrite a working domain when a targeted repair is safer, and do not combine behaviour changes with broad refactoring.
- Do not silently swallow errors. Do not claim success based only on a passing build.

### No speculative or defensive slop

Write the code the current requirement needs — nothing more.

- Do not handle edge cases that cannot occur given the actual types, schema constraints, and call sites. Let impossible states be impossible instead of guarding them.
- Do not add fallbacks, retries, caches, timeouts, feature flags, or `try/catch` around code that cannot meaningfully fail. Errors that cannot be handled locally should surface.
- Do not add optional chaining, null coalescing, or defensive casts to satisfy a type the data already guarantees; fix the type instead.
- Do not add microservices, CQRS, event buses, generic repositories, DI frameworks, provider-neutral adapters, or abstractions with one implementation unless a demonstrated problem requires them. Do not abstract to avoid a few duplicated lines.
- Do not add configuration, options objects, or extension points for hypothetical future callers.
- Do not add UI, state, or data fetching because a library offers it or the data happens to exist.
- Delete dead code rather than commenting it out. Comment *why* a non-obvious boundary exists, never what obvious syntax does.
- Do not add speculative features, fake data, fake activity, fake testimonials, fake partners, invented statistics, or unverifiable marketing claims.

## Supabase and security

- Never expose or log service-role keys, payment secrets, Lovable API keys, webhook secrets, or user tokens in browser code, logs, docs, commits, or output. Browser `VITE_*` values may be public configuration; server secrets must never move into them.
- Authorization is enforced by RLS, database constraints/functions, or authenticated Edge Functions. Browser route guards are UX only.
- Never weaken RLS, grants, trigger protections, payment verification, usage enforcement, or role checks to make a test pass.
- Every billable AI or payment operation must be enforced server-side. Payment verification must confirm provider status, amount, currency, plan, user ownership, and replay/idempotency before granting access.
- Preserve existing auth, RLS, storage, Edge Functions, migrations, and schema integration unless the task requires a verified change.
- Database changes require an explicit migration, rollback explanation, and verification plan. Do not apply them remotely without approval.
- Do not run `supabase link`, `db pull`, `db push`, `migration repair`, or function deployment against the Lovable Cloud project unless ownership is established and the exact operation is separately approved. Migration to a developer-owned Supabase project is a separate project, not routine cleanup.
- Do not reconstruct deployed-only Edge Functions from frontend call sites; recover the deployed source first. Do not hand-create a database baseline from generated TypeScript types.

## Lovable compatibility

Lovable-specific code is not automatically residue. Before removing or restructuring it, classify it as `ACTIVE PLATFORM DEPENDENCY`, `USEFUL INTEGRATION`, `HISTORICAL COMPATIBILITY`, `GENERATED CODE DEBT`, or `UNKNOWN`. Do not remove the first two or `UNKNOWN` without explicit approval; if safety cannot be determined from repository evidence, classify as `UNKNOWN` and stop.

Keep Lovable concerns near real integration seams (OAuth, AI gateway, email, webhooks, generated Supabase files, deployment). Core Syncareer domain code must stay understandable without knowledge of Lovable internals.

## TypeScript, dependencies, and generated code

- Do not weaken compiler options, add blanket ignores, or use broad `any`/casts to obtain a green typecheck. Fix the runtime assumption, schema drift, or interface.
- Validate genuinely untrusted data at runtime: form boundaries, Edge Function requests, external APIs, AI output, webhook payloads, stored JSON. Do not re-validate data already validated at the boundary.
- Generated Supabase types are artifacts; establish the regeneration workflow before editing them by hand. Keep the root and app copies in sync.
- Use the repository's authoritative package manager (Corepack pnpm, frozen lockfile). Before adding a production dependency, verify platform APIs and current dependencies do not already solve the need.

---

# Syncareer Product & Interface Doctrine

Design policy. It sits alongside the engineering policy above and never overrides security, data-truthfulness, or maintainability rules.

## Product definition

Syncareer is a **career operating environment**, not a tool collection. Every screen belongs to one of three verbs:

- **Discover** — opportunities, companies, mentors, career exploration.
- **Prove** — evidence, requirements, applications, CV, application readiness.
- **Advance** — interview, assessment, skills, feedback, next actions.

Changes must strengthen `discover → prove → advance`. Adding a screen without connecting career objects is a regression.

Syncareer must not read as a generic AI startup, an AI wrapper, a student CRUD dashboard, a template SaaS app, a bag of unrelated pages, or a clone of CareerOS, DataCamp, Coursera, Linear, Vercel, or Supabase.

## Reference principle

External products may be studied for **principles only**: CareerOS for career density, interconnected objects, and progressive disclosure; DataCamp for a deliberate token system and information hierarchy; Coursera for progression, states, and guided workflows. Never copy layouts, colours, wording, branding, or distinctive visual compositions.

## Visual identity

- A recognisable application canvas: subtle blue/blue-grey environmental background, white work surfaces, deep blue/teal brand identity.
- Restrained semantic accents, strong typography, deliberate whitespace, moderate geometry, restrained borders, very limited shadows.
- No gratuitous gradients, no glassmorphism, no animated AI decoration, no visual noise.
- Distinctiveness comes from composition, interaction, typography, colour relationships, visual objects, progression language, and application/evidence relationships — never from unusual CSS tricks.
- `artifacts/syncareer/src/index.css` and `tailwind.config.ts` are the single token source of truth (see `docs/DESIGN_TOKENS.md`). Consume semantic tokens; never introduce page-local palettes, type scales, or radii.

## Three visual modes, one product

| Mode | Surfaces | Character |
|---|---|---|
| **Discover** | Dashboard, Opportunities, Mentors, exploration | spacious, visual, approachable, lighter density, recognisable career objects |
| **Prove** | Applications, requirements, evidence, review, tailoring | dossier/workspace, precise, information-dense, evidence-first, strong context preservation |
| **Advance** | Interview, Assessment, Skills, development workflows | progressive, interactive, focused, feedback-oriented, clear progression |

All modes share typography, colour, spacing scale, control primitives, iconography, status semantics, focus states, accessibility behaviour, responsive behaviour, and motion principles — but must not be forced into identical layouts. **Distinct workspace, same product** is a core rule.

## Dossier rule

The dossier is a signature pattern for Prove mode (`src/components/dossier/`, `src/features/application-dossier/`). Preserve and strengthen it, and keep it scoped: Dashboard, Opportunities, Interview, Assessment, Mentors, and Landing must not become documents. `dossierScope.test.ts` encodes this; keep it passing.

Terminology stays plain: Application, Requirements, Evidence, Progress, Next step, Activity. Do not invent vocabulary where an ordinary word works.

## Human design rule

Every visible element must answer at least one of: what does this tell me? what can I do with it? what state is it communicating? what context does it preserve?

Show explicit loading, empty, success, warning, and error states. Keep hierarchy clear, placement predictable, navigation persistent on desktop, and next actions visible. Use progressive disclosure and contextual panels/previews that preserve context.

## AI principle

AI is embedded intelligence, not the brand. Prefer contextual suggestions, explanations, recommendations, evidence guidance, and feedback inside the workflow. Avoid standalone AI chat surfaces where in-workflow assistance suffices, plus AI avatars, sparkles, and repeated "AI-powered" labelling.

## Interaction and motion

- Motion communicates cause and effect, hierarchy, continuity, state, progress, and feedback. Transitions ~120–180ms. Respect `prefers-reduced-motion`.
- Avoid motion that distracts, blocks interaction, shifts layout, adds cognitive noise, burns CPU, or feels like a demo.
- Hover must only communicate interactivity or reveal secondary context; anything on hover must also be reachable by keyboard and touch. Essential actions never live on hover alone.
- Tooltips are short explanations; rich previews carry structured context. Use one consistent card-preview pattern.

## Performance

Prefer CSS transforms/opacity, lightweight transitions, lazy loading, reserved image dimensions, and minimal client-side JavaScript for visual effects. Do not add large animation libraries without demonstrated need.

## Accessibility

Keyboard access, visible focus, semantic HTML, sufficient contrast, meaningful labels, touch-friendly targets, reduced-motion support, and screen-reader compatibility are non-negotiable.

## Responsive

Mobile is a deliberate layout, not a compressed desktop. At any viewport: exactly one global navigation mechanism, one contextual navigation mechanism, no unnecessary horizontal navigation, no hover-dependent functionality.

## SEO and truthfulness

Public pages are search-friendly; authenticated pages must not be unintentionally indexed. Maintain unique titles, useful descriptions, canonical URLs, semantic headings, Open Graph metadata, sitemap, robots rules, and structured data only where visible content supports it.

Never fabricate ratings, testimonials, user counts, partner logos, employment outcomes, success percentages, ATS-performance claims, or customer numbers.

---

# Verification and done

## Before finishing

- Run the frozen install, `typecheck`, relevant tests (full suite when practical), and the production build. Run database/RLS or Edge Function tests when those areas change.
- Inspect the final diff for accidental generated files, secrets, lockfile churn, unrelated formatting, weakened validation, and unnecessary abstractions.
- Do not deploy, merge, rotate secrets, mutate production data, apply remote migrations, or remove live integrations without explicit authorization. For destructive work, inspect exact targets and stop for approval.

Authoritative commands (repo root):

```bash
corepack pnpm install --config.verify-deps-before-run=false --frozen-lockfile
corepack pnpm run typecheck        # must pass
corepack pnpm run test             # vitest
corepack pnpm run build            # production build
corepack pnpm run schema:repo:smoke
corepack pnpm run schema:types:check
```

## Documentation

Update current architecture/runbook docs when behaviour or operating procedures change. Do not present archived plans as current architecture. When a session exposes a repeated repository-specific mistake, propose a concise `AGENTS.md` update rather than growing this file with one-off details.

## Definition of done

- Requested behaviour implemented with the smallest sensible change, and no code beyond what it requires.
- Relevant tests exist and pass; typecheck and build status honestly reported, stating whether failures are pre-existing or introduced.
- Security, RLS, payment, AI-cost, and platform-integration boundaries preserved.
- Documentation matches the resulting system.
- The final response lists changed files, verification performed, remaining risks, and any user action still required.
