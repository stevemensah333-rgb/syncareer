# Verified schema snapshots

This directory is reserved for **schema-only, reviewed Lovable Cloud exports** and their manifests.

- Files here are restore inputs for isolated verification; they are not production migrations and must never be applied to the live Lovable Cloud database.
- Never place a raw Lovable **Export project data** artifact here. Lovable's export contains production rows.
- Never derive a snapshot from generated TypeScript, application calls, `docs/archive`, or unreconciled Git-history migrations.
- A snapshot is acceptable only when its source, UTC capture time, SHA-256, environment, Postgres/extension versions, export method, and last included applied migration identity are recorded next to it.
- Future migrations may be replayed after a snapshot only when Lovable's applied migration ledger proves they are later than the snapshot marker.

See [`docs/SCHEMA_RECONCILIATION.md`](../../docs/SCHEMA_RECONCILIATION.md) for the authority order, blocked status, owner/support request, restore protocol, and type synchronization workflow.
