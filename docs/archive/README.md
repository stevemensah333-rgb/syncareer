# ⚠️ Archived documents — historical & non-authoritative

Everything in this directory is **historical** and **non-authoritative**. It was
written against earlier versions of Syncareer and describes architecture, product
features, and commands that may no longer be true.

Treat this directory as a reference for *what used to exist*, not as a guide to
*what exists now*. Do not rely on it for setup, deployment, security decisions,
or code understanding.

## Where to look instead

| Topic | Current document |
|---|---|
| Everything / engineering policy | [`../../AGENTS.md`](../../AGENTS.md) and [`../../README.md`](../../README.md) |
| Architecture & data flow | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Setup / test / build | [`../BUILD_AND_CHECK.md`](../BUILD_AND_CHECK.md) |
| Test matrix | [`../TEST_MATRIX.md`](../TEST_MATRIX.md) |
| Schema / migrations / types | [`../SCHEMA_RECONCILIATION.md`](../SCHEMA_RECONCILIATION.md) |
| Edge functions & deployment | [`../EDGE_FUNCTIONS.md`](../EDGE_FUNCTIONS.md), [`../BACKEND_PLATFORM_INVENTORY.md`](../BACKEND_PLATFORM_INVENTORY.md) |
| Payments / subscriptions | [`../PAYMENT_AND_SUBSCRIPTIONS.md`](../PAYMENT_AND_SUBSCRIPTIONS.md) |
| Lovable boundaries | [`../LOVABLE_INTEGRATION.md`](../LOVABLE_INTEGRATION.md) |
| Incident / recovery | [`../INCIDENT_RECOVERY.md`](../INCIDENT_RECOVERY.md) |

## Known-stale topics in this archive

- **Express/Node API server** (`artifacts/api-server`) — does not exist today.
- **Employer dashboard / employer role** — removed.
- **Offline PWA** (`vite-plugin-pwa`, `offline.html`, install/offline UI) — no
  offline PWA ships; current service-worker code is decommission logic.
- **Clerk auth** — the Clerk *provider* is gone. A deliberately Clerk-shaped
  `useClerk()` shim over `supabase.auth` survives in
  `artifacts/syncareer/src/lib/auth.tsx` and is still used by `Navbar.tsx` and
  `Settings.tsx`; it is live code, not residue.
- **`CLEANUP_BACKLOG.md`** — superseded audit backlog (see its header note).
- **`TYPECHECK_TRACKING.md`** — resolved 205-error typecheck baseline.
- **Replit "attached_assets" branding capture** — a scrape of an unrelated
  third-party site; removed, nothing consumed it.
- **Expo/React Native `artifacts/syncareer-mobile`** — never present in this
  repository; leftover ignore rules and pnpm overrides were removed.

When in doubt, verify against current code (see the documents above), never
against this archive.
