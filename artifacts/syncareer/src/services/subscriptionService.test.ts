import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { isPremiumUser, getUserSubscription } from './subscriptionService';

/**
 * Matrix 1.6 / 4.1 — Subscription access gating (revenue).
 * Critical revenue behavior: a user must only be premium when their active
 * subscription is premium and unexpired.
 */

const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

function mockSingleRow(row: unknown | null, errorCode?: string) {
  const error = errorCode ? { code: errorCode, message: 'not found' } : null;
  fromMock.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: row, error }),
  });
}

describe('getUserSubscription', () => {
  it('returns null when no row exists (PGRST116)', async () => {
    mockSingleRow(null, 'PGRST116');
    await expect(getUserSubscription('u1')).resolves.toBeNull();
  });

  it('returns the row when present', async () => {
    const row = { id: 's1', user_id: 'u1', tier: 'premium', status: 'active' };
    mockSingleRow(row);
    await expect(getUserSubscription('u1')).resolves.toMatchObject({ id: 's1' });
  });

  it('returns null on a hard error instead of throwing', async () => {
    mockSingleRow(null, '22P02');
    await expect(getUserSubscription('u1')).resolves.toBeNull();
  });
});

describe('isPremiumUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is false for a user with no subscription', async () => {
    mockSingleRow(null, 'PGRST116');
    await expect(isPremiumUser('u1')).resolves.toBe(false);
  });

  it('is false when the subscription is not active', async () => {
    mockSingleRow({ id: 's1', user_id: 'u1', tier: 'premium', status: 'canceled', current_period_end: null });
    await expect(isPremiumUser('u1')).resolves.toBe(false);
  });

  it('is false for an active free tier', async () => {
    mockSingleRow({ id: 's1', user_id: 'u1', tier: 'free', status: 'active', current_period_end: null });
    await expect(isPremiumUser('u1')).resolves.toBe(false);
  });

  it('is false for an active premium subscription whose period has expired', async () => {
    mockSingleRow({
      id: 's1', user_id: 'u1', tier: 'premium', status: 'active',
      current_period_end: new Date(Date.now() - 1000 * 60).toISOString(),
    });
    await expect(isPremiumUser('u1')).resolves.toBe(false);
  });

  it('is true for an active, unexpired premium subscription', async () => {
    mockSingleRow({
      id: 's1', user_id: 'u1', tier: 'premium', status: 'active',
      current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    });
    await expect(isPremiumUser('u1')).resolves.toBe(true);
  });
});
