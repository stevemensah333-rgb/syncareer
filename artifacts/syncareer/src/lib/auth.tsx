import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Auth boundary for the app.
 *
 * `useClerk()` keeps a Clerk-shaped name for historical reasons: the app was
 * migrated off Clerk to Supabase Auth and the call sites (`Navbar`, `Settings`)
 * were left untouched. Clerk is NOT a provider here — everything below is
 * `supabase.auth`. Renaming it is a deliberate follow-up, not cleanup.
 */

interface AuthContextValue {
  session: Session | null;
  isLoaded: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoaded: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let receivedAuthEvent = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      // If onAuthStateChange already fired with the truth, don't overwrite it
      // with a possibly-stale initial getSession result.
      if (!receivedAuthEvent) {
        setSession(data.session ?? null);
      }
      setIsLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      receivedAuthEvent = true;
      setSession(newSession ?? null);
      setIsLoaded(true);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, isLoaded }),
    [session, isLoaded],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const { session, isLoaded } = useContext(AuthContext);
  return {
    isLoaded,
    isSignedIn: !!session,
    userId: session?.user?.id ?? null,
    sessionId: session?.access_token ?? null,
    getToken: async () => session?.access_token ?? null,
  };
}

export function useClerk() {
  return {
    signOut: async (opts?: { redirectUrl?: string }) => {
      await supabase.auth.signOut();
      if (opts?.redirectUrl && typeof window !== "undefined") {
        window.location.assign(opts.redirectUrl);
      }
    },
  };
}
