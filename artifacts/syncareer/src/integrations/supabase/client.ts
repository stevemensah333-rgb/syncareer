import { createClient } from '@supabase/supabase-js';
import { v5 as uuidv5, validate as uuidValidate } from 'uuid';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ── Clerk ID → Supabase UUID mapping ───────────────────────────────────────
// Clerk issues IDs like "user_2abc..." but the Supabase schema uses UUID
// columns for `profiles.id` and every `user_id` foreign key. To bridge the
// two without a schema migration, we deterministically derive a UUIDv5 from
// the Clerk ID using a fixed namespace. The namespace UUID below MUST NEVER
// change — changing it would orphan every existing user's data.
const SYNCAREER_CLERK_NAMESPACE = '7b9c5e8a-3f2d-4c1b-a8e6-1d5f7a9c2b4e';

export function clerkIdToSupabaseId(clerkId: string | null | undefined): string | null {
  if (!clerkId) return null;
  // If it's already a valid UUID (e.g. legacy Supabase-auth user), pass through.
  if (uuidValidate(clerkId)) return clerkId;
  return uuidv5(clerkId, SYNCAREER_CLERK_NAMESPACE);
}

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
  // Convert the Clerk user.id (e.g. "user_2abc...") into a deterministic UUID
  // so every downstream caller of supabase.auth.getSession()/getUser() reads
  // a value that satisfies the UUID-typed columns in the Supabase schema.
  if (user) {
    _clerkUser = { ...user, id: clerkIdToSupabaseId(user.id)! };
  } else {
    _clerkUser = null;
  }
  _clerkToken = token;

  // NOTE: We deliberately do NOT inject the Clerk JWT into the Supabase
  // client's Authorization header. The Supabase project is not configured
  // to trust Clerk-issued JWTs (no third-party auth integration / JWT
  // template), so passing the raw Clerk token causes every /rest/v1/*
  // request to fail with 401 / PGRST301 ("No suitable key or wrong key
  // type"). Leaving the header alone means supabase-js falls back to the
  // anon key, which is accepted; user-owned writes that require RLS to
  // identify the caller are routed through the API server instead
  // (see /api/onboarding) using the Supabase service role.
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
