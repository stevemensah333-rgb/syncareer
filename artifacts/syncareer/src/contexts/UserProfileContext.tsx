import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@clerk/react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseUserId } from '@/hooks/useSupabaseUserId';

interface StudentDetails {
  year_of_admission: number | null;
  expected_completion: number | null;
  major: string;
  school: string | null;
  degree_type: string;
}

interface EmployerDetails {
  company_name: string;
  company_location: string | null;
  industry: string | null;
  company_size: string | null;
  job_title: string | null;
  company_website: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_description: string | null;
}

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  onboarding_completed: boolean;
  tour_completed: boolean | null;
  user_type: string | null;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  studentDetails: StudentDetails | null;
  employerDetails: EmployerDetails | null;
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

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const userId = useSupabaseUserId();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null);
  const [employerDetails, setEmployerDetails] = useState<EmployerDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const [profileResult, studentResult, employerResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabase.from('student_details').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('employer_details').select('*').eq('user_id', uid).maybeSingle(),
      ]);

      if (profileResult.error) {
        console.error('Error fetching profile:', profileResult.error);
      }

      if (profileResult.data) {
        setProfile(profileResult.data as UserProfile);
        if (profileResult.data.user_type === 'student' && studentResult.data) {
          setStudentDetails(studentResult.data as StudentDetails);
          setEmployerDetails(null);
        } else if (profileResult.data.user_type === 'employer' && employerResult.data) {
          setEmployerDetails(employerResult.data as EmployerDetails);
          setStudentDetails(null);
        } else {
          setStudentDetails(null);
          setEmployerDetails(null);
        }
      } else {
        setProfile(null);
        setStudentDetails(null);
        setEmployerDetails(null);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !userId) {
      setProfile(null);
      setStudentDetails(null);
      setEmployerDetails(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchProfile(userId);
  }, [isLoaded, isSignedIn, userId]);

  const refreshProfile = async () => {
    if (!userId) return;
    setLoading(true);
    await fetchProfile(userId);
  };

  return (
    <UserProfileContext.Provider value={{ profile, studentDetails, employerDetails, loading, refreshProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
};
