import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseUserId } from '@/hooks/useSupabaseUserId';

interface StudentDetails {
  year_of_admission: number | null;
  expected_completion: number | null;
  major: string;
  school: string | null;
  degree_type: string;
}

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  created_at: string | null;
  onboarding_completed: boolean;
  // tour_completed is optional because the column may not exist in the live
  // Supabase schema cache; QuickTour falls back to localStorage when missing.
  tour_completed?: boolean | null;
  user_type: string | null;
}

export interface UserProfileContextType {
  profile: UserProfile | null;
  studentDetails: StudentDetails | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};

interface UserProfileProviderProps {
  children: ReactNode;
}

// NOTE: tour_completed is intentionally omitted — the column is missing from
// the live Supabase schema and PostgREST 42703s on explicit selects of unknown
// columns (it tolerates missing columns only when using select('*')).
const PROFILE_COLUMNS =
  'id, username, full_name, avatar_url, bio, linkedin_url, created_at, onboarding_completed, user_type';
const STUDENT_COLUMNS =
  'year_of_admission, expected_completion, major, school, degree_type';

export const userProfileKeys = {
  all: ['user-profile'] as const,
  bundle: (uid: string) => ['user-profile', uid] as const,
};

async function fetchProfileBundle(uid: string) {
  const [profileResult, studentResult] = await Promise.all([
    supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', uid).maybeSingle(),
    supabase.from('student_details').select(STUDENT_COLUMNS).eq('user_id', uid).maybeSingle(),
  ]);

  if (profileResult.error) {
    console.error('Error fetching profile:', profileResult.error);
  }

  const profile = (profileResult.data as UserProfile | null) ?? null;
  const role = profile?.user_type;
  const studentDetails =
    role === 'student' ? ((studentResult.data as StudentDetails | null) ?? null) : null;

  return { profile, studentDetails };
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const userId = useSupabaseUserId();
  const queryClient = useQueryClient();

  const enabled = isLoaded && isSignedIn && !!userId;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: userId ? userProfileKeys.bundle(userId) : userProfileKeys.all,
    queryFn: () => fetchProfileBundle(userId as string),
    enabled,
    staleTime: 60_000,
  });

  const value = useMemo<UserProfileContextType>(() => {
    if (!enabled) {
      return {
        profile: null,
        studentDetails: null,
        loading: !isLoaded,
        refreshProfile: async () => {},
      };
    }
    return {
      profile: data?.profile ?? null,
      studentDetails: data?.studentDetails ?? null,
      loading: isLoading || isFetching,
      refreshProfile: async () => {
        if (!userId) return;
        await queryClient.invalidateQueries({ queryKey: userProfileKeys.bundle(userId) });
      },
    };
  }, [enabled, isLoaded, data, isLoading, isFetching, userId, queryClient]);

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};
