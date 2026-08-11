import { describe, it, expect, beforeEach } from 'vitest';
import {
  startTrackingApplication,
  updateApplicationStatus,
  saveApplicationNotes,
  removeApplicationRecord,
  classifyTrackerError,
  type TrackerClient,
} from './tracking';

interface Row {
  id: string;
  job_id: string;
  applicant_id: string;
  status: string;
  notes: string | null;
}

/**
 * Minimal in-memory `job_applications` fake so the tracking seam runs
 * against realistic read-before-write semantics without a live database.
 * It does not model RLS — ownership scoping is asserted through the filters
 * the code emits.
 */
class FakeApplicationsDb {
  rows: Row[] = [];
  failNext: { code?: string; message?: string; status?: number } | null = null;
  private seq = 0;

  private takeError(): { data: null; error: { code?: string; message: string; status?: number } } | null {
    if (!this.failNext) return null;
    const err = { code: this.failNext.code, message: this.failNext.message ?? 'boom', status: this.failNext.status };
    this.failNext = null;
    return { data: null, error: err };
  }

  asClient(): TrackerClient {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const db = this;
    return {
      from(table: string) {
        if (table !== 'job_applications') throw new Error(`unexpected table ${table}`);
        const filters: { col: string; val: unknown }[] = [];
        const runFiltered = () =>
          db.rows.filter((r) => filters.every((f) => (r as unknown as Record<string, unknown>)[f.col] === f.val));
        const builder: any = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            filters.push({ col, val });
            return builder;
          },
          insert: (values: Record<string, unknown>) => {
            const err = db.takeError();
            if (err) return { ...err, select: () => ({ single: () => err }) };
            const row: Row = {
              id: `app-${++db.seq}`,
              job_id: String(values.job_id),
              applicant_id: String(values.applicant_id),
              status: String(values.status ?? 'pending'),
              notes: (values.notes as string | null) ?? null,
            };
            db.rows.push(row);
            return {
              select: () => ({ single: () => ({ data: { id: row.id }, error: null }) }),
            };
          },
          update: (values: Record<string, unknown>) => {
            const eqChain: any = {
              eq: (col: string, val: unknown) => {
                filters.push({ col, val });
                const err = db.takeError();
                if (err) return { error: err.error };
                for (const row of runFiltered()) Object.assign(row, values);
                return { error: null };
              },
            };
            return eqChain;
          },
          delete: () => {
            const eqChain: any = {
              eq: (col: string, val: unknown) => {
                filters.push({ col, val });
                const err = db.takeError();
                if (err) return err;
                db.rows = db.rows.filter((r) => !runFiltered().includes(r));
                return { error: null };
              },
            };
            return eqChain;
          },
          maybeSingle: () => {
            const err = db.takeError();
            if (err) return err;
            const found = runFiltered();
            return { data: found[0] ? { id: found[0].id } : null, error: null };
          },
        };
        return builder;
      },
    } as unknown as TrackerClient;
  }
}

describe('tracking seam', () => {
  let db: FakeApplicationsDb;

  beforeEach(() => {
    db = new FakeApplicationsDb();
  });

  it('creates a pending application row on first track', async () => {
    const result = await startTrackingApplication(db.asClient(), 'user-1', 'job-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadyTracked).toBe(false);
      expect(result.applicationId).toBeTruthy();
    }
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0]).toMatchObject({ job_id: 'job-1', applicant_id: 'user-1', status: 'pending' });
  });

  it('never creates duplicates — second track reports alreadyTracked', async () => {
    await startTrackingApplication(db.asClient(), 'user-1', 'job-1');
    const second = await startTrackingApplication(db.asClient(), 'user-1', 'job-1');
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.alreadyTracked).toBe(true);
    expect(db.rows).toHaveLength(1);
  });

  it('scopes duplicate detection per user', async () => {
    await startTrackingApplication(db.asClient(), 'user-1', 'job-1');
    const other = await startTrackingApplication(db.asClient(), 'user-2', 'job-1');
    expect(other.ok).toBe(true);
    if (other.ok) expect(other.alreadyTracked).toBe(false);
    expect(db.rows).toHaveLength(2);
  });

  it('maps a unique-violation race to alreadyTracked instead of an error', async () => {
    // Simulate a table with a pre-existing row the select "misses".
    const err = { code: '23505', message: 'duplicate key value violates unique constraint' };
    const racing = {
      from: () =>
        ({
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => ({ data: null, error: null }) }) }) }),
          insert: () => ({ select: () => ({ single: () => ({ data: null, error: err }) }) }),
        }) as any,
    } as unknown as TrackerClient;
    const result = await startTrackingApplication(racing, 'user-1', 'job-1');
    expect(result).toEqual({ ok: true, applicationId: null, alreadyTracked: true });
  });

  it('classifies insert failures into safe categories', async () => {
    db.failNext = { code: '42501', message: 'new row violates row-level security policy' };
    const result = await startTrackingApplication(db.asClient(), 'user-1', 'job-9');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.category).toBe('permission');
      expect(result.userMessage).not.toContain('row-level security');
    }
    expect(db.rows).toHaveLength(0);
  });

  it('updates status and notes (normalizing blank notes to null)', async () => {
    const created = await startTrackingApplication(db.asClient(), 'user-1', 'job-1');
    const id = created.ok ? created.applicationId : null;
    expect(id).toBeTruthy();

    expect(await updateApplicationStatus(db.asClient(), id!, 'interview')).toEqual({ ok: true });
    expect(db.rows[0]?.status).toBe('interview');

    expect(await saveApplicationNotes(db.asClient(), id!, '  follow up Friday ')).toEqual({ ok: true });
    expect(db.rows[0]?.notes).toBe('follow up Friday');

    expect(await saveApplicationNotes(db.asClient(), id!, '   ')).toEqual({ ok: true });
    expect(db.rows[0]?.notes).toBeNull();
  });

  it('removes a record and reports permission failures safely', async () => {
    const created = await startTrackingApplication(db.asClient(), 'user-1', 'job-1');
    const id = created.ok ? created.applicationId! : '';
    expect(await removeApplicationRecord(db.asClient(), id)).toEqual({ ok: true });
    expect(db.rows).toHaveLength(0);

    db.failNext = { code: '42501', message: 'permission denied for table job_applications' };
    const denied = await updateApplicationStatus(db.asClient(), 'app-x', 'hired');
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.category).toBe('permission');
  });
});

describe('classifyTrackerError', () => {
  it('maps auth expiry signals', () => {
    expect(classifyTrackerError({ code: 'JWTExpired', message: 'JWT expired' }).category).toBe('auth-expired');
    expect(classifyTrackerError({ message: 'Auth session missing!' }).category).toBe('auth-expired');
    expect(classifyTrackerError({ status: 401, message: 'unauthorized' }).category).toBe('auth-expired');
  });

  it('maps permission errors', () => {
    expect(classifyTrackerError({ code: '42501', message: 'x' }).category).toBe('permission');
    expect(classifyTrackerError({ message: 'new row violates row-level security policy' }).category).toBe('permission');
  });

  it('maps network failures (no code)', () => {
    expect(classifyTrackerError({ message: 'Failed to fetch' }).category).toBe('network');
    expect(classifyTrackerError(new TypeError('fetch failed')).category).toBe('network');
  });

  it('falls back to server for unknown errors and never leaks internals', () => {
    const result = classifyTrackerError({ code: '42P01', message: 'relation "secret" does not exist' });
    expect(result.category).toBe('server');
    expect(result.code).toBe('42P01');
    expect(result.userMessage).not.toContain('secret');
  });
});
