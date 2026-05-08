import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { useUserProfile } from '@/contexts/UserProfileContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { loading: profileLoading } = useUserProfile();
  const location = useLocation();

  useEffect(() => {
    const initializeAuth = async () => {
      const wasSessionOnly = localStorage.getItem('syncareer_session_only');
      const currentSessionMarker = sessionStorage.getItem('syncareer_active_session');
      
      if (wasSessionOnly === 'true' && !currentSessionMarker) {
        await supabase.auth.signOut();
        localStorage.removeItem('syncareer_session_only');
        setSession(null);
        setAuthLoading(false);
        return;
      }
      
      sessionStorage.setItem('syncareer_active_session', 'true');
      
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setAuthLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Wait for BOTH auth AND profile to resolve before rendering anything
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
