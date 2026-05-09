import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// createClient validates the URL at construction time. When env vars are
// missing we fall back to a syntactically valid placeholder so the app can
// still render the sign-in screen with a clear "not configured" notice
// instead of crashing with an uncaught error.
const SAFE_URL = SUPABASE_URL || "https://placeholder.supabase.co";
const SAFE_KEY = SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(SAFE_URL, SAFE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
