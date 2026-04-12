import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserRouteInfo {
  route: string;
  userType: string | null;
}

// Cache for user types to avoid repeated queries
const userTypeCache = new Map<string, string | null>();

export async function getUserRoute(userId: string): Promise<string> {
  // Check cache first
  if (userTypeCache.has(userId)) {
    const userType = userTypeCache.get(userId);
    return getRouteForType(userId, userType);
  }

  // Fetch user type from profiles
  const { data } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', userId)
    .single();

  const userType = data?.user_type || null;
  userTypeCache.set(userId, userType);
  
  return getRouteForType(userId, userType);
}

function getRouteForType(userId: string, userType: string | null): string {
  switch (userType) {
    case 'career_counsellor':
      return `/counsellor-dashboard`;
    case 'employer':
      return `/my-company`;
    default:
      return `/dashboard`;
  }
}

export function useUserRoute(userId: string | null): UserRouteInfo {
  const [routeInfo, setRouteInfo] = useState<UserRouteInfo>({
    route: userId ? `/portfolio/${userId}` : '/',
    userType: null,
  });

  useEffect(() => {
    if (!userId) return;

    const fetchUserType = async () => {
      const route = await getUserRoute(userId);
      const userType = userTypeCache.get(userId) || null;
      setRouteInfo({ route, userType });
    };

    fetchUserType();
  }, [userId]);

  return routeInfo;
}
