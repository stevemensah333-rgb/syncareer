import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// ── Clerk auth compatibility shim ──────────────────────────────────────────
// Clerk owns authentication. These globals are set by <AuthBridge> in App.tsx
// so that supabase.auth.getSession / getUser return the Clerk session instead.
// All other supabase calls (from, rpc, storage) remain unchanged.

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
}

const _originalGetSession = supabase.auth.getSession.bind(supabase.auth);
const _originalGetUser = supabase.auth.getUser.bind(supabase.auth);
const _originalOnAuthStateChange = supabase.auth.onAuthStateChange.bind(supabase.auth);
const _originalSignOut = supabase.auth.signOut.bind(supabase.auth);

// @ts-ignore — patching the bound method
supabase.auth.getSession = async () => {
  if (_clerkUser) {
    return {
      data: {
        session: {
          user: _clerkUser,
          access_token: _clerkToken ?? '',
        } as any,
      },
      error: null,
    };
  }
  return { data: { session: null }, error: null };
};

// @ts-ignore
supabase.auth.getUser = async () => {
  if (_clerkUser) {
    return { data: { user: _clerkUser as any }, error: null };
  }
  return { data: { user: null }, error: null };
};

// @ts-ignore — no-op: Clerk owns the auth state changes
supabase.auth.onAuthStateChange = (_callback: any) => {
  return { data: { subscription: { unsubscribe: () => {} } } };
};

// @ts-ignore — sign-out is handled by Clerk's useClerk().signOut()
supabase.auth.signOut = async () => {
  return { error: null };
};