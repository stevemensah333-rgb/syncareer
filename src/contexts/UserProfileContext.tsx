import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null);
  const [employerDetails, setEmployerDetails] = useState<EmployerDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setProfile(null);
        setStudentDetails(null);
        setEmployerDetails(null);
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      // Fetch profile and both role-specific details in parallel.
      // Use maybeSingle() so missing role rows (new users mid-onboarding) don't throw 406s.
      const [profileResult, studentResult, employerResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('student_details').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('employer_details').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      if (profileResult.error) {
        console.error('Error fetching profile:', profileResult.error);
      }

      if (profileResult.data) {
        setProfile(profileResult.data as UserProfile);

        // Set role-specific details based on user_type (data already fetched)
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
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    setLoading(true);
    await fetchProfile();
  };

  return (
    <UserProfileContext.Provider value={{ profile, studentDetails, employerDetails, loading, refreshProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
};
