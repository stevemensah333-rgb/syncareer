# Platform Artifact Inventory & Cleanup Record

Complete, evidence-based classification of every artifact in this repository that
was created by, or exists for, a build platform or AI builder: **Replit**,
**Lovable**, **GPT Engineer**, **Clerk** (abandoned auth provider), the removed
**PWA/offline** architecture, the never-present **Expo mobile** artifact, and
duplicate package managers.

Classifications follow `AGENTS.md`: `ACTIVE PLATFORM DEPENDENCY`,
`USEFUL INTEGRATION`, `HISTORICAL COMPATIBILITY`, `GENERATED CODE DEBT`, `UNKNOWN`.

Two rules govern this document:

- A file is **not** kept because a vibe-coding platform created it.
- A file is **not** removed because its name contains a vendor.

Companion documents: [`LOVABLE_INTEGRATION.md`](./LOVABLE_INTEGRATION.md) (Lovable
boundaries), [`BUILD_AND_CHECK.md`](./BUILD_AND_CHECK.md) (package-manager
authority and verification), [`BACKEND_PLATFORM_INVENTORY.md`](./BACKEND_PLATFORM_INVENTORY.md)
(edge functions and secrets).

---

## 1. Platform posture (the two decisions everything else follows from)

### Lovable — **intentionally retained**

Lovable Cloud is the operating platform and hosted-backend authority: Supabase
project, Google OAuth, AI gateway, transactional email/webhooks, analytics/SEO,
and deployment. No Lovable capability was removed. Evidence: `AGENTS.md`,
`README.md`, `LOVABLE_INTEGRATION.md`, live `LOVABLE_API_KEY` consumers in
`supabase/functions/`, and `@lovable.dev/cloud-auth-js` bound to
`GoogleSignInButton.tsx` with a contract test.

### Replit — **intentionally retained**

Replit remains an active development/preview surface, so its configuration and
Vite plugins are kept and isolated rather than removed. Evidence:

- `artifacts/syncareer/.replit-artifact/artifact.toml` declares the dev and
  production commands, and they match the **current** toolchain exactly
  (`corepack pnpm … --dir artifacts/syncareer exec vite …`, `publicDir =
  artifacts/syncareer/dist/public`, which is the real Vite `build.outDir`).
  A stale artifact file would not agree with the current build.
- `.replit` `[[ports]] localPort = 19713` matches `artifact.toml`'s
  `services.env.PORT = "19713"`.
- `.replit` `[agent] stack = "PNPM_WORKSPACE"` and `[deployment.postBuild]`
  `corepack pnpm store prune` match pnpm being the authoritative manager.
- `pnpm-workspace.yaml` `minimumReleaseAgeExclude: '@replit/*'` exists so Replit
  plugin updates are not delayed by the 1440-minute quarantine.
- `docs/BUILD_AND_CHECK.md` lists Replit as a pnpm consumer.
- The whole `artifacts/<name>/` repository layout is the Replit artifact convention.

Consequence: `.replit`, `.replitignore`, `.replit-artifact/artifact.toml`,
`replit.md`, and the three `@replit/vite-plugin-*` dependencies are **kept**.
Only *dangling* Replit configuration (a hook pointing at a script that does not
exist) and Replit-agent *output* with no consumer were removed.

---

## 2. Retained artifacts

### 2.1 `ACTIVE PLATFORM DEPENDENCY`

| Artifact | Owner | Evidence of active use | Effect if removed |
|---|---|---|---|
| `.replit` | Replit | Declares modules, deployment target, port map, agent stack | Replit preview/deploy breaks |
| `.replitignore` | Replit | Shrinks the deploy image (`.local` pnpm store) | Slower/larger Replit publishes |
| `artifacts/syncareer/.replit-artifact/artifact.toml` | Replit | Dev + production commands, `publicDir`, port — all match the current build | Replit dev server and publish break |
| `@replit/vite-plugin-runtime-error-modal` | Replit | `vite.config.ts`, loaded when `NODE_ENV !== "production"` | Loss of the dev error overlay; **prod builds unaffected** |
| `@replit/vite-plugin-cartographer` | Replit | `vite.config.ts`, gated on `REPL_ID !== undefined` | Replit code-mapping lost; no effect off-Replit |
| `@replit/vite-plugin-dev-banner` | Replit | `vite.config.ts`, gated on `REPL_ID !== undefined` | Replit dev banner lost; no effect off-Replit |
| `minimumReleaseAgeExclude: '@replit/*'` | Replit | Exempts the three plugins above from the release-age quarantine | Replit plugin updates delayed 24h |
| `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc` | pnpm (authoritative) | Every root script, `.replit` postBuild, `artifact.toml` | All builds break |
| `bun.lock` (root) and `artifacts/syncareer/bun.lock` | Lovable | Every URL resolves through Lovable's private proxy `europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache` | Lovable sandbox installs lose their pinned, proxied resolutions |
| `@lovable.dev/cloud-auth-js` | Lovable | `src/integrations/lovable/index.ts` → `GoogleSignInButton.tsx`; covered by `googleSignInContract.test.tsx` | Google OAuth sign-in breaks |
| `npm:@lovable.dev/email-js` | Lovable | `supabase/functions/process-email-queue/` | Transactional email delivery breaks |
| `npm:@lovable.dev/webhooks-js` | Lovable | `supabase/functions/handle-email-suppression/` | Bounce/complaint webhook verification breaks |
| `LOVABLE_API_KEY`, `LOVABLE_SEND_URL` | Lovable | AI gateway + email edge functions (see `BACKEND_PLATFORM_INVENTORY.md` §6) | AI coach, market intelligence, alumni outcomes, email all break |
| Root `.env` (tracked) | Lovable/Replit publish | `vite.config.ts` sets `envDir` to the repo root; `PUBLISH_TROUBLESHOOTING.md` explicitly warns against ignoring it | Publish artifact loses `VITE_SUPABASE_*` at build time |
| Root `src/integrations/supabase/types.ts` | Lovable auto-sync | Read as the **source** by `scripts/schema/generated-types.mjs` (`schema:types:check` / `schema:types:sync`) | The generated-types sync workflow breaks |

### 2.2 `USEFUL INTEGRATION`

| Artifact | Owner | Evidence | Notes |
|---|---|---|---|
| `artifacts/syncareer/src/integrations/lovable/index.ts` | Lovable | Imported by `GoogleSignInButton.tsx` | The real OAuth seam; do not make it vendor-neutral |
| Root `src/integrations/lovable/index.ts` | Lovable auto-sync | No in-repo importer, but it is the landing zone Lovable writes to alongside `types.ts` | Deleting invites sync churn; kept with the rest of the sync target |
| Root `src/integrations/supabase/client.ts` | Lovable auto-sync | Same sync target | Same |
| `replit.md` | Replit | Current and accurate (React 19 / Vite 7, "no Express", "no PWA"); links to `README.md` as authoritative | Already rewritten by an earlier pass — the expected "stale Express/PWA guide" no longer exists |
| `.agents/agent_assets_metadata.toml` | Replit agent | Provenance for the seven `public/landing/*.png` images that `CommunitySection`, `SolutionSection`, and `SuccessStoriesSection` actually render | Kept; only its one dangling entry was removed |
| `index.html` `og:image` / `twitter:image` on `storage.googleapis.com/gpt-engineer-file-uploads/...` | GPT Engineer / Lovable | Live social-preview asset referenced by SEO metadata | Removing it breaks link previews. Migrating to `public/opengraph.jpg` is a content decision, not cleanup |

### 2.3 `HISTORICAL COMPATIBILITY`

| Artifact | Owner | Evidence | Decision |
|---|---|---|---|
| `useClerk()` in `artifacts/syncareer/src/lib/auth.tsx` | Clerk (abandoned provider) | Call sites migrated to `useAuth()` | **Removed.** Replaced by `useAuth()` in `Navbar.tsx` and `Settings.tsx`. Its unused siblings were removed (§3.6) |
| `.lovable/plan.md` | Lovable | Audit log of a prior automated pass; inside a directory Lovable owns | **Kept** — prior explicit retention decision (`LOVABLE_INTEGRATION.md`, `BACKEND_PLATFORM_INVENTORY.md` §5) |
| `docs/archive/**` | Various | Explicitly non-authoritative; linked from `README.md` and `docs/archive/README.md` | **Kept**, and two superseded docs were moved *into* it (§3.7) |

### 2.4 `UNKNOWN` — kept, with the exact evidence required before removal

| Artifact | Why it cannot be decided from repository evidence | Evidence needed to remove |
|---|---|---|
| `artifacts/syncareer/public/sw.js` and `removeLegacyBrowserCaches()` in `src/main.tsx` | This is PWA **decommission** code (unregister service workers, delete caches), not a PWA. Whether it is still needed depends on how many returning browsers still hold a registration from the old build — which the repository cannot know. | (1) The date the last PWA-enabled build was deployed; (2) confirmation that the decommission window (typically ≥ the longest realistic return-visit interval) has fully elapsed; (3) analytics showing zero `serviceWorker` unregistrations still firing. Remove `sw.js`, the `main.tsx` helper, and the `README`/`ARCHITECTURE` sections together. |
| `@tailwindcss/typography` in `artifacts/syncareer/package.json` | It is **not** registered in `tailwind.config.ts` (`plugins: [require("tailwindcss-animate")]`), yet `prose …` classes are used by `BlogPost.tsx`, `PrivacyPolicy.tsx`, and `TermsAndConditions.tsx`. Those pages are therefore rendering unstyled today. This is a latent styling bug, not dead weight — removing the package would cement the bug. | A product decision: either register the plugin (fixes three pages, a visual change and thus out of cleanup scope) or drop the `prose` classes. Only after that is the dependency's fate decidable. |
| `apple-mobile-web-app-capable` / `-status-bar-style` / `-title` metas in `index.html` | Residue of the removed PWA, but they still change iOS "Add to Home Screen" behaviour for existing users. | Confirmation that no user is expected to launch Syncareer from an iOS home-screen shortcut. |
| `<meta name="author" content="Lovable" />` in `index.html` | Factually wrong authorship for Syncareer, but it is live SEO metadata; editing it is a content change, not residue removal. | Owner's decision on the correct `author` value. |

---

## 3. Removed artifacts

Every item below was confirmed to have **no** importer, script, build reference,
deployment reference, or documented workflow before deletion.

### 3.1 Captured/generated assets — `GENERATED CODE DEBT`

Removed: the entire `attached_assets/` directory (7 files, ~2.3 MB) and the
`"@assets"` alias in `artifacts/syncareer/vite.config.ts`.

| Path | Owner | Finding |
|---|---|---|
| `attached_assets/logoHref.html` | Replit agent | A 189 KB saved copy of a **Replit profile page** — not a Syncareer asset. Contains the owner's email, client IP, Statsig/LaunchDarkly flag dumps and Replit's own public env blob. |
| `attached_assets/branding-1778263719083.json` | Replit agent | Branding scrape of `keitimas.framer.website`, an unrelated life-coaching site, with LLM "reasoning" fields. |
| `attached_assets/content-1778263718406.md` | Replit agent | Markdown scrape of the same unrelated site. |
| `attached_assets/screenshot-1778263717882.png` (2.0 MB), `ogImage.jpg`, `logo.svg`, `favicon.png` | Replit agent | Captured assets of that unrelated site; none matches Syncareer branding. |

Consumer check: `grep` for `@assets` across `artifacts/syncareer/src` and `src`
returned **zero** importers; the alias was the only reference in the repo.
Verified by a production build after removal — bundle output was byte-identical.

### 3.2 Duplicate package manager — `GENERATED CODE DEBT`

Removed: `package-lock.json`.

- No `.github/` directory exists → no Dependabot, Renovate, or npm CI consumer.
- No script anywhere invokes `npm`.
- npm does not read `pnpm-workspace.yaml`, so `npm ci` only ever installed the
  four root dependencies and never `artifacts/syncareer` — a broken install that
  could only mislead.
- `pnpm` authority is asserted by `README.md`, `docs/BUILD_AND_CHECK.md`,
  `.replit` `[deployment.postBuild]`, and `artifact.toml`.

Both `bun.lock` files were **kept** (§2.1) — Bun is a real Lovable consumer.

### 3.3 Dead workspace configuration — `GENERATED CODE DEBT`

In `pnpm-workspace.yaml`:

| Removed | Evidence it was dead |
|---|---|
| The entire `catalog:` block (20 entries incl. `drizzle-orm`, `tsx`, `wouter`, `@tailwindcss/vite`) | No `catalog:` specifier exists in any `package.json`; `pnpm-lock.yaml` has **no** `catalogs:` section; `PUBLISH_TROUBLESHOOTING.md` explicitly forbids introducing them ("`artifacts/syncareer/package.json` must stay standalone-publishable") |
| 10 `@expo/ngrok-bin>*` overrides | Residue of an Expo/React-Native artifact that does not exist. `@expo/ngrok-bin` appears **0×** in `pnpm-lock.yaml` |
| `@esbuild-kit/esm-loader` → `tsx` override | `@esbuild-kit/esm-loader` appears 0× in the lockfile; the override was a no-op |
| `stripe-replit-sync` in `minimumReleaseAgeExclude` | Not a dependency anywhere; no client payment provider remains after the free-product change (legacy Paystack verification stays deployed-only) |
| `@swc/core`, `msw`, `unrs-resolver` in `onlyBuiltDependencies` | All 0× in the lockfile. `core-js`, `esbuild`, `protobufjs` are real and were kept |

### 3.4 Dead dependencies — `GENERATED CODE DEBT`

Removed from `artifacts/syncareer/package.json`, with matching surgical edits to
`pnpm-lock.yaml` and `artifacts/syncareer/bun.lock`:

| Dependency | Evidence | Replacement in use |
|---|---|---|
| `wouter` | Zero imports; `react-router-dom` is the router (`App.tsx`) | `react-router-dom` |
| `@hookform/resolvers` | Zero imports; validation goes through `lib/validationSchemas.ts` with `zod` directly | plain `zod` |
| `react-icons` | Zero imports | `lucide-react` |
| `tw-animate-css` | Zero imports; `index.css` uses Tailwind v3 `@tailwind` directives | `tailwindcss-animate` (registered in `tailwind.config.ts`) |
| `uuid` | Zero imports; the codebase calls `crypto.randomUUID()` | native `crypto.randomUUID()` |

Transitively dropped by pnpm and by the bun reachability check, identically:
`mitt`, `regexparam`.

**Why `bun.lock` was hand-pruned instead of regenerated.** Every URL in it points
at Lovable's private proxy. Running `bun install` here would rewrite all 468
entries to `registry.npmjs.org` and destroy Lovable's pinned resolutions. Instead
each lockfile was edited surgically: the dependency line was removed from the
workspace map, then a scripted reachability walk over
`dependencies`/`peerDependencies`/`optionalDependencies` identified exactly which
package entries became unreachable. The result was validated by re-parsing the
file and asserting its dependency name set equals `package.json` exactly.
Independently, pnpm's own resolver dropped the *same* transitive set.

Note: `bun.lock` was **already** out of sync with `package.json` before this
change (`vite ^7.3.2` vs `^7.3.5`, `postcss ^8.5.14` vs `^8.5.23`), which is
evidence Lovable regenerates it rather than enforcing `--frozen-lockfile`. That
pre-existing drift was left untouched.

### 3.5 Removed-architecture residue — `GENERATED CODE DEBT`

| Removed | Evidence |
|---|---|
| `[postMerge] path = "scripts/post-merge.sh"` in `.replit` | `scripts/` contains only `schema/`; the hook pointed at a file that does not exist and would fail on every merge |
| `<link rel="apple-touch-icon" href="/pwa-192x192.png" />` in `index.html` | `artifacts/syncareer/public/pwa-192x192.png` does not exist — a guaranteed 404 left behind by the removed PWA |
| `[[generated]]` entry for `artifacts/syncareer-mobile/assets/images/icon.png` in `.agents/agent_assets_metadata.toml` | `artifacts/` contains only `syncareer`; the Expo mobile artifact does not exist |
| `.expo`, `.expo-shared` in `.gitignore` | Same non-existent mobile artifact |
| `.cursor/rules/nx-rules.mdc`, `.github/instructions/nx.instructions.md` in `.gitignore` | No Nx anywhere (`nx.json`, `@nx/*`, `@nrwl/*` all absent) and no `.cursor/` directory — ignore rules for a tool this repo never uses |

### 3.6 Abandoned auth-provider residue — `HISTORICAL COMPATIBILITY` with no consumer

Removed from `artifacts/syncareer/src/lib/auth.tsx` (all verified to have **zero**
importers across `artifacts/syncareer/src`):

- `useUser()` — the Clerk-shaped user hook
- `SignedIn` / `SignedOut` components (`App.tsx`'s `SignedOut` is an unrelated *page*)
- `useClerk().openUserProfile()`
- the now-unreachable `ShimUser` type, `toShimUser()` mapper, and the `user`
  field on the auth context

Kept: `AuthProvider` and `useAuth` — all live (`useClerk` was removed and its call sites migrated to `useAuth`). Enforced by `noUnusedLocals` + `noUnusedParameters` in `artifacts/syncareer/tsconfig.json`.

### 3.7 Superseded documentation

Moved to `docs/archive/` with header notes explaining what superseded them
(content preserved, not deleted):

| Document | Why it is no longer current |
|---|---|
| `TYPECHECK_TRACKING.md` → `docs/archive/` | Tracks a 205-error typecheck baseline that is resolved; `tsc --noEmit` now reports 0. It was already described as "retained for history" but sat at the repository root as though current |
| `docs/CLEANUP_BACKLOG.md` → `docs/archive/` | Materially contradicted by the repository: claims 3 tracked edge functions (there are 11), ~150 strict-null errors (there are 0), and "no tooling for duplicate types" (`schema:types:check` / `schema:types:sync` exist). Not referenced from the README index |

---

## 4. Secret-exposure assessment

**No secret rotation is required.**

- The tracked root `.env` contains exactly three keys: `VITE_SUPABASE_PROJECT_ID`,
  `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- The publishable key was decoded **claims-only, without printing its value**:
  `{"role": "anon", "iss": "supabase", "ref": "fsorkxlcasekndigezlx"}`. It is the
  anon/publishable key, which is public by design and is shipped inside the
  browser bundle regardless. No service-role key, payment secret, Lovable API
  key, or webhook secret is present.
- Git history could not be mined: this working copy is a **shallow clone with a
  single commit** (`git rev-parse --is-shallow-repository` → `true`). The
  assessment above therefore covers the current tree only. If a full-history
  secret scan has never been run against the GitHub repository, that remains an
  open action — see §5.
- `attached_assets/logoHref.html`, now removed, embedded the owner's email
  address, client IP, and **Replit's** public front-end keys (Stripe publishable,
  Firebase web API key). Those are third-party public values, not Syncareer
  credentials, so nothing there needs rotating either. They do remain in git
  history until the repository is rewritten, which is not recommended for
  publishable values.

Because `.env` is intentionally tracked, `.env.example` now documents the full
variable set (names only) and `.gitignore` protects `.env.local` / `.env.*.local`
so local overrides can never be committed.

---

## 5. Open follow-ups (not actioned in this cleanup stage)

1. **PWA decommission window** — supply the evidence in §2.4 and then remove
   `public/sw.js`, `removeLegacyBrowserCaches()`, and the matching `README.md` /
   `ARCHITECTURE.md` sections together.
2. **`prose` styling bug** — `@tailwindcss/typography` is installed but not
   registered while three pages use `prose` classes. Decide: register the plugin
   or drop the classes.
3. **`useClerk` rename (Completed)** — `useClerk` has been removed and its two call sites (`Navbar`, `Settings`) migrated to `useAuth()`.
4. **Generated-type drift** — `pnpm schema:types:check` reports the root (Lovable)
   and app copies out of sync. This is pre-existing and intentional until a fresh
   Lovable regeneration (see `SCHEMA_RECONCILIATION.md`).
5. **Full-history secret scan** — run one against the GitHub repository, since
   this shallow clone cannot verify history.
6. **`og:image` hosting** — the social image is served from GPT Engineer's bucket
   while `public/opengraph.jpg` sits unused. Consolidating is a content decision.
