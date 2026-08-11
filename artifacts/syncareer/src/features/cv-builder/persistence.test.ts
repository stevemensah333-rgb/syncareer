import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { CVData } from './types';
import { initialCVData } from './types';
import {
  validateCVData,
  cvDataToResumeColumns,
  resumeRowToCVData,
  savePrimaryCV,
  loadPrimaryCV,
  classifySaveError,
  cvSaveToast,
  logCvPersistenceFailure,
} from './persistence';
import { useCVPersistence } from '@/hooks/useCVPersistence';
import { supabase } from '@/integrations/supabase/client';
import { computeFullScore } from './scoring';

type Db = SupabaseClient<Database>;

function validCV(overrides?: Partial<CVData>): CVData {
  return {
    ...initialCVData,
    ...overrides,
    personal: {
      ...initialCVData.personal,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      ...(overrides?.personal ?? {}),
    },
  };
}

type Row = {
  id: string;
  user_id: string;
  is_primary: boolean | null;
  title: string;
  template: string;
  personal_info: unknown;
  education: unknown;
  experience: unknown;
  projects: unknown;
  achievements: unknown;
  skills: unknown;
  references_section: string | null;
};

/**
 * Minimal in-memory `resumes` fake so the real persistence functions run
 * against realistic create/update/read semantics without a live database. It
 * does not model RLS — ownership scoping is asserted through the queries the
 * code emits.
 */
class FakeResumeDb {
  rows: Row[] = [];
  failOp: 'select' | 'update' | 'insert' | null = null;
  failError: { code: string; message: string } = {
    code: '42501',
    message: 'new row violates row-level security policy',
  };
  private seq = 0;

  seed(row: Partial<Row>): Row {
    const full = { ...this.blank(), ...row };
    full.id = row.id ?? this.nextId();
    this.rows.push(full);
    return full;
  }

  private nextId(): string {
    this.seq += 1;
    return `r${this.seq}`;
  }

  private blank(): Row {
    return {
      id: '',
      user_id: '',
      is_primary: null,
      title: '',
      template: 'basic',
      personal_info: {},
      education: [],
      experience: [],
      projects: [],
      achievements: [],
      skills: [],
      references_section: null,
    };
  }

  get client(): Db {
    return { from: (table: string) => this.chain(table) } as unknown as Db;
  }

  private chain(table: string) {
    let mode: 'select' | 'update' | 'insert' | 'upsert' = 'select';
    let selectCols: string[] = [];
    let filters: Array<{ col: string; val: unknown }> = [];
    let writeData: unknown = null;

    const self = {
      select: (cols: string) => {
        selectCols = cols
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        return self;
      },
      eq: (col: string, val: unknown) => {
        filters.push({ col, val });
        return self;
      },
      order: () => self,
      limit: () => self,
      update: (data: unknown) => {
        mode = 'update';
        writeData = data;
        return self;
      },
      insert: (data: unknown) => {
        mode = 'insert';
        writeData = data;
        return self;
      },
      upsert: () => {
        mode = 'upsert';
        return self;
      },
      maybeSingle: () => this.execute(mode, selectCols, filters, writeData, true),
      single: () => this.execute(mode, selectCols, filters, writeData, true),
    };
    return self;
  }

  private execute(
    mode: 'select' | 'update' | 'insert' | 'upsert',
    selectCols: string[],
    filters: Array<{ col: string; val: unknown }>,
    writeData: unknown,
    single: boolean,
  ): Promise<{ data: unknown; error: unknown }> {
    if (this.failOp && this.failOp === mode) {
      return Promise.resolve({ data: null, error: this.failError });
    }

    if (mode === 'select') {
      const matched = this.rows.filter((r) => filters.every((f) => (r as Record<string, unknown>)[f.col] === f.val));
      if (matched.length === 0) return Promise.resolve({ data: null, error: null });
      if (single && matched.length > 1) {
        return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'Multiple rows returned' } });
      }
      const row = matched[matched.length - 1];
      return Promise.resolve({ data: this.project(row, selectCols), error: null });
    }

    if (mode === 'insert') {
      const arr = (Array.isArray(writeData) ? writeData : [writeData]) as Array<Partial<Row>>;
      const inserted = arr.map((d) => {
        const full = { ...this.blank(), ...d, id: d.id ?? this.nextId() } as Row;
        this.rows.push(full);
        return full;
      });
      const data = single ? this.project(inserted[0], selectCols) : inserted.map((r) => this.project(r, selectCols));
      return Promise.resolve({ data, error: null });
    }

    if (mode === 'update') {
      const matched = this.rows.filter((r) => filters.every((f) => (r as Record<string, unknown>)[f.col] === f.val));
      if (matched.length === 0) return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found' } });
      const row = matched[0];
      Object.assign(row, writeData);
      const data = single ? this.project(row, selectCols) : matched.map((r) => this.project(r, selectCols));
      return Promise.resolve({ data, error: null });
    }

    // upsert (user_skills) is not tracked by this fake — treat as success.
    return Promise.resolve({ data: null, error: null });
  }

  private project(row: Row, cols: string[]): Record<string, unknown> {
    if (cols.length === 0) return { id: row.id };
    const out: Record<string, unknown> = {};
    for (const c of cols) (out as Record<string, unknown>)[c] = (row as unknown as Record<string, unknown>)[c];
    return out;
  }
}

describe('validateCVData', () => {
  it('accepts a CV with required identity fields', () => {
    expect(validateCVData(validCV()).ok).toBe(true);
  });

  it('rejects missing first name, last name, and email with field-level messages', () => {
    const result = validateCVData(initialCVData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.firstName).toMatch(/First name/);
      expect(result.errors.lastName).toMatch(/Last name/);
      expect(result.errors.email).toMatch(/Email/);
    }
  });

  it('rejects an invalid email format', () => {
    const result = validateCVData(validCV({ personal: { ...validCV().personal, email: 'not-an-email' } }));
    expect(result.ok).toBe(false);
  });
});

describe('cvDataToResumeColumns (normalization)', () => {
  it('normalizes empty references_section to null', () => {
    const cv = validCV();
    cv.references = '';
    expect(cvDataToResumeColumns(cv).references_section).toBeNull();
  });

  it('keeps a populated references_section and builds a title from names', () => {
    const cv = validCV();
    cv.references = 'Available on request';
    const cols = cvDataToResumeColumns(cv);
    expect(cols.references_section).toBe('Available on request');
    expect(cols.title).toBe('John Doe CV');
  });
});

describe('savePrimaryCV', () => {
  it('creates the first CV for an authenticated user and returns its stable id', async () => {
    const db = new FakeResumeDb();
    const result = await savePrimaryCV(db.client, 'u1', validCV());
    expect(result).toEqual({ ok: true, resumeId: 'r1' });
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].user_id).toBe('u1');
    expect(db.rows[0].is_primary).toBe(true);
  });

  it('updates the existing CV instead of creating a duplicate', async () => {
    const db = new FakeResumeDb();
    const first = await savePrimaryCV(db.client, 'u1', validCV());
    const second = await savePrimaryCV(db.client, 'u1', validCV({ skills: ['React', 'SQL'] }));
    expect(first).toEqual({ ok: true, resumeId: 'r1' });
    expect(second).toEqual({ ok: true, resumeId: 'r1' });
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].skills).toEqual(['React', 'SQL']);
  });

  it('rejects missing required data before any persistence', async () => {
    const db = new FakeResumeDb();
    const result = await savePrimaryCV(db.client, 'u1', initialCVData);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.category).toBe('validation');
    expect(db.rows).toHaveLength(0);
  });

  it('rejects a missing ownership context before any persistence', async () => {
    const db = new FakeResumeDb();
    const result = await savePrimaryCV(db.client, '   ', validCV());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.category).toBe('auth-expired');
    expect(db.rows).toHaveLength(0);
  });

  it('does not read, update, or create rows for another user', async () => {
    const db = new FakeResumeDb();
    db.seed({ user_id: 'u2', is_primary: true, personal_info: { firstName: 'Other' } });
    await savePrimaryCV(db.client, 'u1', validCV());
    expect(db.rows).toHaveLength(2);
    const u2row = db.rows.find((r) => r.user_id === 'u2');
    expect((u2row?.personal_info as { firstName?: string }).firstName).toBe('Other');
    const u1rows = db.rows.filter((r) => r.user_id === 'u1');
    expect(u1rows).toHaveLength(1);
  });

  it('reports an RLS/permission failure and leaves the database untouched', async () => {
    const db = new FakeResumeDb();
    db.seed({ id: 'r9', user_id: 'u1', is_primary: true, personal_info: { firstName: 'Original' } });
    db.failOp = 'update';
    const result = await savePrimaryCV(db.client, 'u1', validCV());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.category).toBe('permission');
      expect(result.code).toBe('42501');
      expect(result.userMessage).toMatch(/permission/i);
    }
    // Editor state is never mutated by persistence — and the DB row is intact.
    expect((db.rows[0].personal_info as { firstName?: string }).firstName).toBe('Original');
  });

  it('reports a database failure without claiming persistence', async () => {
    const db = new FakeResumeDb();
    db.failOp = 'insert';
    db.failError = { code: 'XX000', message: 'database unavailable' };
    const result = await savePrimaryCV(db.client, 'u1', validCV());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.category).toBe('server');
      expect(result.code).toBe('XX000');
    }
    expect(db.rows).toHaveLength(0);
  });

  it('reports a thrown network failure and leaves the draft untouched', async () => {
    const client = {
      from: () => { throw new Error('Failed to fetch'); },
    } as unknown as Db;
    const draft = validCV({ skills: ['React'] });
    const result = await savePrimaryCV(client, 'u1', draft);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.category).toBe('network');
    expect(draft.skills).toEqual(['React']);
  });
});

describe('loadPrimaryCV (reload after refresh)', () => {
  it('returns null for a user with no saved CV', async () => {
    const db = new FakeResumeDb();
    await expect(loadPrimaryCV(db.client, 'u1')).resolves.toBeNull();
  });

  it('reloads the same saved CV and stable id after a save', async () => {
    const db = new FakeResumeDb();
    const cv = validCV({ skills: ['React', 'SQL'] });
    const saved = await savePrimaryCV(db.client, 'u1', cv);
    const loaded = await loadPrimaryCV(db.client, 'u1');
    expect(loaded).not.toBeNull();
    expect(loaded?.resumeId).toBe(saved.resumeId);
    expect(loaded?.cv.personal.firstName).toBe('John');
    expect(loaded?.cv.skills).toEqual(['React', 'SQL']);
  });

  it('preserves CV strength score and content consistency after a round-trip', () => {
    const cv = validCV({ skills: ['React', 'SQL'] });
    cv.references = 'Available on request';
    cv.experience = [
      { id: 'e1', company: 'Acme', location: '', date: '2023', role: 'Engineer', bullets: ['Built a thing'] },
    ];
    cv.activities = [
      { id: 'a1', organization: 'Robotics Club', activity: 'Mentoring', date: '2024', role: 'Mentor', bullets: ['Guided 5 students'] },
    ];
    const cols = cvDataToResumeColumns(cv);
    const reloaded = resumeRowToCVData(cols);
    expect(reloaded.personal.firstName).toBe('John');
    expect(reloaded.references).toBe('Available on request');
    expect(reloaded.experience[0].company).toBe('Acme');
    expect(reloaded.activities[0]).toMatchObject({ organization: 'Robotics Club', role: 'Mentor' });
    expect(reloaded.skills).toEqual(['React', 'SQL']);
    expect(computeFullScore(cv).totalScore).toBe(computeFullScore(reloaded).totalScore);
  });
});

describe('classifySaveError (safe, actionable errors)', () => {
  it('classifies an expired session', () => {
    const e = classifySaveError({ code: 'PGRST301', message: 'JWT expired' });
    expect(e.category).toBe('auth-expired');
    expect(e.userMessage).toMatch(/sign in/i);
  });

  it('classifies an RLS/permission failure', () => {
    const e = classifySaveError({ code: '42501', message: 'new row violates row-level security policy' });
    expect(e.category).toBe('permission');
  });

  it('classifies a network failure', () => {
    const e = classifySaveError(new Error('Failed to fetch'));
    expect(e.category).toBe('network');
  });

  it('treats unknown/constraint errors as unexpected server failures and keeps the safe code', () => {
    const e = classifySaveError({ code: '23505', message: 'duplicate key' });
    expect(e.category).toBe('server');
    expect(e.code).toBe('23505');
  });

  it('never surfaces raw payload details in the user message', () => {
    const e = classifySaveError({ code: '42501', message: 'new row violates row-level security policy for table resumes', details: 'user_id=abc' });
    expect(e.userMessage.toLowerCase()).not.toContain('row-level');
    expect(e.userMessage.toLowerCase()).not.toContain('abc');
  });

  it('logs only safe diagnostic context in development', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logCvPersistenceFailure('save', { category: 'permission', code: '42501' });
    expect(consoleSpy).toHaveBeenCalledWith('[CV persistence]', {
      operation: 'save', table: 'resumes', category: 'permission', code: '42501',
    });
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain('john@example.com');
    consoleSpy.mockRestore();
  });
});

describe('cvSaveToast (success only after confirmation)', () => {
  it('returns success only for a confirmed save', () => {
    const t = cvSaveToast({ ok: true, resumeId: 'r1' });
    expect(t.type).toBe('success');
    expect(t.message).toBe('CV saved successfully.');
  });

  it('offers a retry action for safe network/server failures', () => {
    const onRetry = vi.fn();
    const t = cvSaveToast({ ok: false, category: 'network', code: null, userMessage: 'no connection' }, { onRetry });
    expect(t.type).toBe('error');
    expect(t.action?.label).toBe('Retry');
  });

  it('does not offer retry for auth/permission failures', () => {
    const t = cvSaveToast({ ok: false, category: 'auth-expired', code: 'NO_SESSION', userMessage: 'sign in' });
    expect(t.type).toBe('error');
    expect(t.action).toBeUndefined();
  });
});

describe('useCVPersistence', () => {
  const getSessionMock = supabase.auth.getSession as unknown as ReturnType<typeof vi.fn>;
  const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockReset();
    fromMock.mockReset();
  });

  it('rejects an unauthenticated save clearly and performs no database write', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    const { result } = renderHook(() => useCVPersistence());
    let res: Awaited<ReturnType<typeof useCVPersistence>['save']>;
    await act(async () => {
      res = await result.current.save(validCV());
    });
    expect(res!?.ok).toBe(false);
    if (res!.ok === false) {
      expect(res!.category).toBe('auth-expired');
      expect(res!.code).toBe('NO_SESSION');
    }
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('coalesces repeated Save clicks into the same in-flight request', async () => {
    let releaseSession: ((value: { data: { session: null }; error: null }) => void) | undefined;
    getSessionMock.mockReturnValue(new Promise((resolve) => { releaseSession = resolve; }));
    const { result } = renderHook(() => useCVPersistence());

    let first!: ReturnType<typeof result.current.save>;
    let second!: ReturnType<typeof result.current.save>;
    act(() => {
      first = result.current.save(validCV());
      second = result.current.save(validCV());
    });
    expect(second).toBe(first);
    expect(getSessionMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      releaseSession?.({ data: { session: null }, error: null });
      await Promise.all([first, second]);
    });
    expect(fromMock).not.toHaveBeenCalled();
  });
});
