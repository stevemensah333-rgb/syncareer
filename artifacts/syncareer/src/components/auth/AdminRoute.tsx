import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { getHomeRouteForRole } from '@/components/auth/RoleRoute';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useSupabaseUserId } from '@/hooks/useSupabaseUserId';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isLoaded } = useAuth();
  const supabaseUserId = useSupabaseUserId();
  const { profile } = useUserProfile();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    const checkAdmin = async () => {
      try {
        if (!supabaseUserId) {
          setChecking(false);
          return;
        }
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', supabaseUserId)
          .eq('role', 'admin')
          .maybeSingle();
        setIsAdmin(!!data);
      } catch (e) {
        console.error('Admin check failed:', e);
      } finally {
        setChecking(false);
      }
    };
    checkAdmin();
  }, [isLoaded, supabaseUserId]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    const homeRoute = getHomeRouteForRole(profile?.user_type || null);
    return <Navigate to={homeRoute} replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
