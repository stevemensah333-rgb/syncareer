import type { Session, User } from "@supabase/supabase-js";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase, supabaseConfigured } from "@/lib/supabase";

type ShimUser = {
  id: string;
  primaryEmailAddress: { emailAddress: string } | null;
  fullName: string | null;
  imageUrl: string;
  firstName: string | null;
  lastName: string | null;
};

function toShimUser(user: User | null | undefined): ShimUser | null {
  if (!user) return null;
  const email = user.email ?? "";
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;
  const [firstName = null, ...rest] = (fullName ?? "").trim().split(/\s+/);
  return {
    id: user.id,
    primaryEmailAddress: email ? { emailAddress: email } : null,
    fullName,
    imageUrl: (user.user_metadata?.avatar_url as string | undefined) ?? "",
    firstName: firstName || null,
    lastName: rest.length ? rest.join(" ") : null,
  };
}

interface AuthContextValue {
  session: Session | null;
  user: ShimUser | null;
  isLoaded: boolean;
  configured: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  isLoaded: false,
  configured: supabaseConfigured,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let receivedAuthEvent = false;
    if (!supabaseConfigured) {
      setIsLoaded(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!receivedAuthEvent) {
        setSession(data.session ?? null);
      }
      setIsLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        receivedAuthEvent = true;
        setSession(newSession ?? null);
        setIsLoaded(true);
      }
    );
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: toShimUser(session?.user),
      isLoaded,
      configured: supabaseConfigured,
    }),
    [session, isLoaded]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const { session, isLoaded, configured } = useContext(AuthContext);
  return {
    isLoaded,
    isSignedIn: !!session,
    userId: session?.user?.id ?? null,
    sessionId: session?.access_token ?? null,
    configured,
    getToken: async () => session?.access_token ?? null,
  };
}

export function useUser() {
  const { user, isLoaded } = useContext(AuthContext);
  return {
    isLoaded,
    isSignedIn: !!user,
    user,
  };
}

export function useClerk() {
  return {
    signOut: async () => {
      if (!supabaseConfigured) return;
      await supabase.auth.signOut();
    },
  };
}

export function SignedIn({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded || !isSignedIn) return null;
  return <>{children}</>;
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded || isSignedIn) return null;
  return <>{children}</>;
}
