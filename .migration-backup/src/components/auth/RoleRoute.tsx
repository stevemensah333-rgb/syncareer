import { Navigate, useLocation } from 'react-router-dom';
import { useUserProfile } from '@/contexts/UserProfileContext';

type UserRole = 'student' | 'employer' | 'career_counsellor';

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

// Maps each role to its default landing page
const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  student: '/dashboard',
  employer: '/my-company',
  career_counsellor: '/counsellor-dashboard',
};

export function getHomeRouteForRole(role: string | null): string {
  if (role && role in ROLE_HOME_ROUTES) {
    return ROLE_HOME_ROUTES[role as UserRole];
  }
  return '/dashboard';
}

/**
 * RoleRoute ensures the authenticated user has the correct role.
 * Must be used INSIDE ProtectedRoute (which handles auth + profile loading).
 * If the user's role doesn't match, they are redirected to their correct dashboard.
 */
const RoleRoute = ({ children, allowedRoles }: RoleRouteProps) => {
  const { profile, loading } = useUserProfile();
  const location = useLocation();

  // Still loading profile - show nothing (ProtectedRoute already shows spinner)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userRole = profile?.user_type as UserRole | null;

  // If no profile or no role set, send to onboarding
  if (!profile || !userRole) {
    return <Navigate to="/onboarding" replace />;
  }

  // If onboarding not completed, redirect to onboarding
  if (!profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  // If role is not allowed for this route, redirect to user's correct home
  if (!allowedRoles.includes(userRole)) {
    const correctHome = getHomeRouteForRole(userRole);
    // Avoid redirect loop
    if (location.pathname === correctHome) {
      return <>{children}</>;
    }
    return <Navigate to={correctHome} replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;
