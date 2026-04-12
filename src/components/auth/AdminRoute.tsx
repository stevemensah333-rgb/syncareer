import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getHomeRouteForRole } from '@/components/auth/RoleRoute';
import { useUserProfile } from '@/contexts/UserProfileContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute checks the user_roles table for the 'admin' role.
 * Must be used INSIDE ProtectedRoute.
 * If the user is not an admin, they're redirected to their role-appropriate home.
 */
const AdminRoute = ({ children }: AdminRouteProps) => {
  const { profile } = useUserProfile();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setChecking(false);
          return;
        }

        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
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
  }, []);

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
