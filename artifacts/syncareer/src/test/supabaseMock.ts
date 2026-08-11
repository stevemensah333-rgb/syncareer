import { vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

/**
 * Chain-mock installer for page-level tests. The global test setup replaces
 * the Supabase client with bare `vi.fn()`s; this helper gives those fns a
 * realistic thenable query-builder implementation for a scenario, e.g.:
 *
 *   installSupabaseMock({
 *     tables: { job_postings: { data: [jobs], error: null } },
 *     maybeSingle: { job_applications: { data: null, error: null } },
 *   });
 *
 * `tables[table]` is the result resolved when a built query is awaited;
 * `maybeSingle`/`single` override those terminals; spies observe writes.
 */

export interface TableResult {
  data: unknown;
  error: unknown;
}
type TableResultSource = TableResult | Promise<TableResult>;

export interface SupabaseMockConfig {
  sessionUserId?: string | null;
  tables?: Record<string, TableResult>;
  /** Per-call table results, useful when initial load succeeds and a later write fails. */
  tableSequences?: Record<string, TableResultSource[]>;
  maybeSingle?: Record<string, TableResult>;
  single?: Record<string, TableResult>;
  insertSpies?: Record<string, (value: unknown) => void>;
  updateSpies?: Record<string, (value: unknown) => void>;
  deleteSpies?: Record<string, () => void>;
}

const CHAIN_METHODS = [
  'select',
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'is',
  'in',
  'not',
  'or',
  'order',
  'limit',
  'range',
  'filter',
  'match',
  'contains',
] as const;

export function installSupabaseMock(config: SupabaseMockConfig = {}): void {
  const auth = supabase.auth as unknown as {
    getSession: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
  };
  const session =
    config.sessionUserId === null
      ? null
      : { user: { id: config.sessionUserId ?? 'user-1' }, access_token: 'token' };
  auth.getSession.mockResolvedValue({ data: { session }, error: null });
  auth.getUser.mockResolvedValue({ data: { user: session?.user ?? null }, error: null });

  const from = supabase.from as unknown as ReturnType<typeof vi.fn>;
  from.mockImplementation((table: string) => {
    const sequence = config.tableSequences?.[table];
    const awaitResult: TableResultSource = sequence && sequence.length > 0
      ? sequence.shift()!
      : config.tables?.[table] ?? { data: [], error: null };
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    for (const method of CHAIN_METHODS) builder[method] = chain;
    builder.maybeSingle = async () => config.maybeSingle?.[table] ?? { data: null, error: null };
    builder.single = async () => config.single?.[table] ?? await awaitResult;
    builder.insert = (value: unknown) => {
      config.insertSpies?.[table]?.(value);
      return builder;
    };
    builder.update = (value: unknown) => {
      config.updateSpies?.[table]?.(value);
      return builder;
    };
    builder.delete = () => {
      config.deleteSpies?.[table]?.();
      return builder;
    };
    builder.upsert = chain;
    builder.then = (resolve: (v: TableResult) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(awaitResult).then(resolve, reject);
    return builder;
  });
}
