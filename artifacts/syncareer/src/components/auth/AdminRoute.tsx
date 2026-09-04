import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { getHomeRouteForRole } from '@/components/auth/RoleRoute';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useSupabaseUserId } from '@/hooks/useSupabaseUserId';
import { Spinner } from '@/components/ui/spinner';

interface AdminRouteProps {
  children: React.ReactNode;
}

const adminCheckKey = (uid: string) => ['user-roles', uid, 'admin'] as const;

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isLoaded } = useAuth();
  const supabaseUserId = useSupabaseUserId();
  const { profile } = useUserProfile();

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: supabaseUserId ? adminCheckKey(supabaseUserId) : ['user-roles', 'anon'],
    enabled: isLoaded && !!supabaseUserId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', supabaseUserId as string)
        .eq('role', 'admin')
        .maybeSingle();
      if (error) {
        console.error('Admin check failed:', error);
        return false;
      }
      return !!data;
    },
  });

  if (!isLoaded || (supabaseUserId && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="size-8 text-primary" role="status" aria-label="Loading" />
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
