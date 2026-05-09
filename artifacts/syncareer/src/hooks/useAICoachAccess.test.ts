import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import * as subscriptionService from '@/services/subscriptionService';
import * as featureAccess from '@/lib/featureAccess';
import { useAICoachAccess } from './useSubscription';

vi.mock('@/services/subscriptionService', () => ({
  getUserSubscription: vi.fn(),
  isPremiumUser: vi.fn(),
}));

vi.mock('@/lib/featureAccess', async (importOriginal) => {
  const actual = await importOriginal<typeof featureAccess>();
  return {
    ...actual,
    getMonthlyUsage: vi.fn(),
  };
});

const mockedAuthUser = (supabase.auth.getUser as unknown as ReturnType<typeof vi.fn>);
const mockedGetMonthlyUsage = featureAccess.getMonthlyUsage as unknown as ReturnType<typeof vi.fn>;
const mockedIsPremium = subscriptionService.isPremiumUser as unknown as ReturnType<typeof vi.fn>;
const mockedGetSub = subscriptionService.getUserSubscription as unknown as ReturnType<typeof vi.fn>;

describe('useAICoachAccess', () => {
  const FREE_LIMIT = featureAccess.FREE_LIMITS.ai_coach_session.limit;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuthUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockedGetSub.mockResolvedValue(null);
  });

  it('allows free users who are under the monthly limit', async () => {
    mockedIsPremium.mockResolvedValue(false);
    mockedGetMonthlyUsage.mockResolvedValue(FREE_LIMIT - 1);

    const { result } = renderHook(() => useAICoachAccess());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allowed).toBe(true);
    expect(result.current.used).toBe(FREE_LIMIT - 1);
    expect(result.current.limit).toBe(FREE_LIMIT);
    expect(result.current.isPremium).toBe(false);
  });

  it('blocks free users who have hit the monthly limit', async () => {
    mockedIsPremium.mockResolvedValue(false);
    mockedGetMonthlyUsage.mockResolvedValue(FREE_LIMIT);

    const { result } = renderHook(() => useAICoachAccess());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allowed).toBe(false);
    expect(result.current.used).toBe(FREE_LIMIT);
    expect(result.current.limit).toBe(FREE_LIMIT);
  });

  it('blocks free users who exceeded the monthly limit', async () => {
    mockedIsPremium.mockResolvedValue(false);
    mockedGetMonthlyUsage.mockResolvedValue(FREE_LIMIT + 5);

    const { result } = renderHook(() => useAICoachAccess());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allowed).toBe(false);
  });

  it('bypasses the limit for premium users without reading usage', async () => {
    mockedIsPremium.mockResolvedValue(true);

    const { result } = renderHook(() => useAICoachAccess());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allowed).toBe(true);
    expect(result.current.isPremium).toBe(true);
    expect(result.current.limit).toBe(Infinity);
    expect(mockedGetMonthlyUsage).not.toHaveBeenCalled();
  });
});
