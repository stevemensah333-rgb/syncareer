import { Navigate, useLocation } from 'react-router-dom';
import { useUserProfile } from '@/contexts/UserProfileContext';
import type { AccountRole } from '@/lib/accountRoles';
import { authPath } from './authUtils';

type UserRole = AccountRole;

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  student: '/dashboard',
  career_counsellor: '/mentor/profile',
};

export function getHomeRouteForRole(role: string | null): string {
  if (role && role in ROLE_HOME_ROUTES) {
    return ROLE_HOME_ROUTES[role as UserRole];
  }
  return '/dashboard';
}

const RoleRoute = ({ children, allowedRoles }: RoleRouteProps) => {
  const { profile, loading } = useUserProfile();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userRole = profile?.user_type as UserRole | null;

  if (!profile || !userRole) {
    return <Navigate to={authPath('/onboarding', `${location.pathname}${location.search}${location.hash}`)} replace />;
  }

  if (!profile.onboarding_completed) {
    return <Navigate to={authPath('/onboarding', `${location.pathname}${location.search}${location.hash}`)} replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    const correctHome = getHomeRouteForRole(userRole);
    if (location.pathname === correctHome) {
      return <>{children}</>;
    }
    return <Navigate to={correctHome} replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;
