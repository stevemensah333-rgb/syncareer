import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ── Clerk auth compatibility shim ──────────────────────────────────────────
// Clerk owns authentication. <AuthBridge> in App.tsx calls setClerkSession()
// on every auth state change to keep the Clerk token current here.
//
// - supabase.auth.getSession/getUser are patched to return the Clerk session
//   so that all existing files using those helpers work without modification.
// - setClerkSession() also updates the Supabase client's Authorization header
//   so that supabase.from(...) queries carry the Clerk JWT, enabling Supabase
//   RLS policies that verify Clerk JWTs (via Supabase JWT template setting).

type ClerkUser = {
  id: string;
  email: string;
  user_metadata: { full_name?: string; avatar_url?: string };
  app_metadata: Record<string, unknown>;
};

let _clerkUser: ClerkUser | null = null;
let _clerkToken: string | null = null;

export function setClerkSession(user: ClerkUser | null, token: string | null) {
  _clerkUser = user;
  _clerkToken = token;

  // Propagate the Clerk JWT into the Supabase client's Authorization header
  // so that supabase.from(...) queries are authenticated under the signed-in user.
  // @ts-ignore — accessing internal rest client headers
  const restHeaders = (supabase as any).rest?.headers;
  if (restHeaders) {
    if (token) {
      restHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete restHeaders['Authorization'];
    }
  }

  // Update realtime auth if realtime is initialised
  try {
    if (token) {
      (supabase as any).realtime?.setAuth(token);
    } else {
      (supabase as any).realtime?.setAuth(null);
    }
  } catch {
    // realtime not yet initialised — safe to ignore
  }
}

// @ts-ignore — patch getSession to return Clerk session
supabase.auth.getSession = async () => {
  if (_clerkUser && _clerkToken) {
    return {
      data: {
        session: {
          user: _clerkUser,
          access_token: _clerkToken,
        } as any,
      },
      error: null,
    };
  }
  return { data: { session: null }, error: null };
};

// @ts-ignore — patch getUser to return Clerk user
supabase.auth.getUser = async () => {
  if (_clerkUser) {
    return { data: { user: _clerkUser as any }, error: null };
  }
  return { data: { user: null }, error: null };
};

// @ts-ignore — no-op: Clerk owns auth state changes; onAuthStateChange callers will simply not fire
supabase.auth.onAuthStateChange = (_callback: any) => {
  return { data: { subscription: { unsubscribe: () => {} } } };
};

// @ts-ignore — sign-out is handled by Clerk's useClerk().signOut()
supabase.auth.signOut = async () => {
  setClerkSession(null, null);
  return { error: null };
};
