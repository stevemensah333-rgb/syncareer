import { useAuth } from '@/lib/auth';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useNoIndex } from '@/hooks/useNoIndex';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isSignedIn, isLoaded } = useAuth();
  const { loading: profileLoading } = useUserProfile();
  const location = useLocation();

  // Every authenticated surface is private to the signed-in user and must not
  // be indexed. This is the page-level guarantee; robots.txt also disallows
  // these paths for crawlers that do not execute JavaScript.
  useNoIndex();

  if (!isLoaded || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-live="polite">
        <span className="text-sm text-muted-foreground">Checking your session…</span>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
