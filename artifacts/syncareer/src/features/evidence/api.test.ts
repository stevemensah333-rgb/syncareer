import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import {
  addEvidenceSource,
  archiveEvidenceItem,
  classifyEvidenceError,
  createApplicationCv,
  createEvidenceItem,
  linkEvidenceToRequirement,
  listApplicationEvidenceLinks,
  listApplicationRequirements,
  listEvidenceItems,
  listEvidenceSources,
  listResumeEvidenceLinks,
} from './api';

/**
 * The wire client is exercised through the same structural interface the api
 * module uses, so the tests stay valid whether the generated types already
 * describe the evidence relations (post-Lovable regeneration) or not.
 */
type WireResult = { data: unknown; error: { message: string; code?: string | null } | null };
type WireQuery = WireResult & PromiseLike<WireResult> & {
  eq: (column: string, value: unknown) => WireQuery;
  order: (column: string, options?: { ascending?: boolean }) => WireQuery;
};

interface WireClientShape {
  rpc: (fn: string, args?: Record<string, unknown>) => WireQuery;
  from: (table: string) => { select: (columns: string) => WireQuery };
}

function wireClient(overrides: {
  rpc?: (fn: string, args?: Record<string, unknown>) => WireQuery;
  from?: (table: string) => { select: (columns: string) => WireQuery };
} = {}): SupabaseClient<Database> {
  return {
    rpc: overrides.rpc ?? (() => { throw new Error('rpc not expected'); }),
    from: overrides.from ?? (() => { throw new Error('from not expected'); }),
  } as unknown as SupabaseClient<Database>;
}

function resolved(result: WireResult, record: Array<{ fn: string; args?: Record<string, unknown> }>, fn?: string, args?: Record<string, unknown>): WireQuery {
  if (fn) record.push({ fn, args });
  const query: WireQuery = {
    ...result,
    then: <T,>(onFulfilled: (value: WireResult) => T) => Promise.resolve(result).then(onFulfilled) as PromiseLike<T>,
    eq: () => query,
    order: () => query,
  };
  return query;
}

const validItemRow = {
  id: '0f0a9a1e-1111-4222-8333-444455556666',
  user_id: 'aa0a9a1e-2222-4333-8444-555566667777',
  category: 'work',
  title: 'Ledger rebuild',
  summary: 'Rebuilt the dues ledger for three terms.',
  occurred_on: null,
  review_status: 'draft',
  created_at: '2026-09-01T10:00:00.000Z',
  updated_at: '2026-09-01T10:00:00.000Z',
};

describe('evidence api — writes', () => {
  it('creates evidence through the RPC and validates the returned row', async () => {
    const calls: Array<{ fn: string; args?: Record<string, unknown> }> = [];
    const client = wireClient({
      rpc: (fn, args) => resolved({ data: validItemRow, error: null }, calls, fn, args),
    });
    const result = await createEvidenceItem(client, {
      category: 'work',
      title: 'Ledger rebuild',
      summary: 'Rebuilt the dues ledger for three terms.',
    });
    expect(result).toEqual({ ok: true, data: validItemRow });
    expect(calls[0]).toEqual({
      fn: 'create_evidence_item',
      args: {
        p_category: 'work',
        p_title: 'Ledger rebuild',
        p_summary: 'Rebuilt the dues ledger for three terms.',
        p_occurred_on: null,
      },
    });
  });

  it('rejects invalid input locally without touching the network', async () => {
    const client = wireClient();
    const result = await createEvidenceItem(client, { category: 'work', title: '   ', summary: 'Substantive.' });
    expect(result).toMatchObject({ ok: false, code: 'INVALID_INPUT' });
  });

  it('classifies a permission failure from the RPC error', async () => {
    const client = wireClient({
      rpc: () => resolved({ data: null, error: { message: 'Application is not available', code: 'P0001' } }, { calls: [] }),
    });
    const result = await createApplicationCv(client, '9f0a9a1e-0000-4000-8000-0000000000aa', '8f0a9a1e-0000-4000-8000-000000000001');
    expect(result).toMatchObject({ ok: false, category: 'permission' });
  });

  it('archives evidence idempotently', async () => {
    const calls: Array<{ fn: string }> = [];
    const client = wireClient({
      rpc: (fn) => resolved({ data: { ...validItemRow, review_status: 'archived' }, error: null }, calls, fn),
    });
    const result = await archiveEvidenceItem(client, validItemRow.id);
    expect(result).toMatchObject({ ok: true, data: { review_status: 'archived' } });
  });

  it('validates a malformed archived row as a server failure', async () => {
    const client = wireClient({
      rpc: () => resolved({ data: { ...validItemRow, review_status: 'reopened' }, error: null }, { calls: [] }),
    });
    const result = await archiveEvidenceItem(client, validItemRow.id);
    expect(result).toMatchObject({ ok: false, category: 'server' });
  });

  it('adds a source with owner ids never accepted from the caller', async () => {
    const calls: Array<{ fn: string; args?: Record<string, unknown> }> = [];
    const sourceRow = {
      id: '5f0a9a1e-0000-4000-8000-000000000001',
      evidence_id: validItemRow.id,
      user_id: validItemRow.user_id,
      source_type: 'url',
      resume_id: null,
      interview_id: null,
      entry_locator: null,
      source_label: 'Society ledger page',
      source_excerpt: 'Ledger summary on the society site.',
      source_url: 'https://society.org/ledger',
      created_at: '2026-09-01T10:30:00.000Z',
      updated_at: '2026-09-01T10:30:00.000Z',
    };
    const client = wireClient({
      rpc: (fn, args) => resolved({ data: sourceRow, error: null }, calls, fn, args),
    });
    const result = await addEvidenceSource(client, {
      evidenceId: validItemRow.id,
      sourceType: 'url',
      sourceLabel: 'Society ledger page',
      sourceExcerpt: 'Ledger summary on the society site.',
      sourceUrl: 'https://society.org/ledger',
    });
    expect(result).toEqual({ ok: true, data: sourceRow });
    expect(calls[0]!.args).toMatchObject({
      p_source_type: 'url',
      p_resume_id: null,
      p_interview_id: null,
      p_source_url: 'https://society.org/ledger',
    });
  });

  it('links evidence to a requirement and passes the relevance note', async () => {
    const calls: Array<{ fn: string; args?: Record<string, unknown> }> = [];
    const linkRow = {
      id: '6f0a9a1e-0000-4000-8000-000000000001',
      requirement_id: '7f0a9a1e-0000-4000-8000-00000000000a',
      evidence_id: validItemRow.id,
      user_id: validItemRow.user_id,
      relevance_note: 'Dues ledger',
      created_at: '2026-09-01T11:00:00.000Z',
    };
    const client = wireClient({
      rpc: (fn, args) => resolved({ data: linkRow, error: null }, calls, fn, args),
    });
    const result = await linkEvidenceToRequirement(client, {
      requirementId: '7f0a9a1e-0000-4000-8000-00000000000a',
      evidenceId: validItemRow.id,
      relevanceNote: 'Dues ledger',
    });
    expect(result).toEqual({ ok: true, data: linkRow });
    expect(calls[0]!.fn).toBe('link_evidence_to_requirement');
  });
});

describe('evidence api — reads', () => {
  it('lists evidence items ordered by creation', async () => {
    const fromCalls: string[] = [];
    const client = wireClient({
      from: (table) => {
        fromCalls.push(table);
        return {
          select: () => resolved({ data: [validItemRow], error: null }, { calls: [] }),
        };
      },
    });
    const result = await listEvidenceItems(client);
    expect(result).toEqual({ ok: true, data: [validItemRow] });
    expect(fromCalls).toEqual(['evidence_items']);
  });

  it('treats a non-array payload as a server failure', async () => {
    const client = wireClient({
      from: () => ({ select: () => resolved({ data: { unexpected: true }, error: null }, { calls: [] }) }),
    });
    const result = await listEvidenceSources(client);
    expect(result).toMatchObject({ ok: false, category: 'server' });
  });

  it('filters out malformed rows instead of rendering them', async () => {
    const client = wireClient({
      from: () => ({
        select: () => resolved({ data: [validItemRow, { broken: true }], error: null }, { calls: [] }),
      }),
    });
    const result = await listApplicationEvidenceLinks(client);
    expect(result).toEqual({ ok: true, data: [] });
  });

  it('scopes requirement reads by application and orders by sort_order', async () => {
    const operations: Array<{ op: string; args: unknown[] }> = [];
    const client = wireClient({
      from: (table) => {
        expect(table).toBe('application_requirements');
        return {
          select: (columns: string) => {
            operations.push({ op: 'select', args: [columns] });
            const query: WireQuery = {
              data: [],
              error: null,
              then: (resolve: (value: WireResult) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve) as PromiseLike<unknown> as never,
              eq: (column: string, value: unknown) => {
                operations.push({ op: 'eq', args: [column, value] });
                return query;
              },
              order: (column: string, options?: { ascending?: boolean }) => {
                operations.push({ op: 'order', args: [column, options] });
                return query;
              },
            };
            return query;
          },
        };
      },
    });
    const result = await listApplicationRequirements(client, '9f0a9a1e-0000-4000-8000-000000000001');
    expect(result).toEqual({ ok: true, data: [] });
    expect(operations).toEqual([
      { op: 'select', args: ['*'] },
      { op: 'eq', args: ['application_id', '9f0a9a1e-0000-4000-8000-000000000001'] },
      { op: 'order', args: ['sort_order', { ascending: true }] },
    ]);
  });

  it('returns empty lists for resume usage links', async () => {
    const client = wireClient({
      from: () => ({ select: () => resolved({ data: [], error: null }, { calls: [] }) }),
    });
    const result = await listResumeEvidenceLinks(client);
    expect(result).toEqual({ ok: true, data: [] });
  });

  it('treats a null list payload as a server failure, not an empty list', async () => {
    const client = wireClient({
      from: () => ({ select: () => resolved({ data: null, error: null }, { calls: [] }) }),
    });
    const result = await listResumeEvidenceLinks(client);
    expect(result).toMatchObject({ ok: false, category: 'server' });
  });
});

describe('classifyEvidenceError', () => {
  it('maps expired sessions to auth-expired', () => {
    expect(classifyEvidenceError({ code: 'PGRST301', message: 'JWT expired' }).category).toBe('auth-expired');
  });

  it('keeps PostgREST codes for diagnostics but never the raw message', () => {
    const failure = classifyEvidenceError({ code: '42501', message: 'row-level security blocked that' });
    expect(failure.category).toBe('permission');
    expect(failure.code).toBe('42501');
    expect(failure.userMessage).not.toContain('row-level');
  });

  it('maps fetch failures to network', () => {
    expect(classifyEvidenceError(new Error('TypeError: Failed to fetch')).category).toBe('network');
  });
});
