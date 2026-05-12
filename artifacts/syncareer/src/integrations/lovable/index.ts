import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "@/integrations/supabase/client";

const lovableAuth = createLovableAuth();

type OAuthProvider = "google";

interface SignInOpts {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
}

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: OAuthProvider, opts?: SignInOpts) => {
      try {
        const result = await lovableAuth.signInWithOAuth(provider, {
          redirect_uri: opts?.redirect_uri ?? window.location.origin,
          extraParams: opts?.extraParams,
        });
        if (result.redirected) {
          return { redirected: true as const, error: null };
        }
        if (result.error) {
          return { redirected: false as const, error: result.error };
        }
        if (result.tokens) {
          const { error } = await supabase.auth.setSession(result.tokens);
          if (error) return { redirected: false as const, error };
        }
        return { redirected: false as const, error: null };
      } catch (err) {
        return {
          redirected: false as const,
          error: err instanceof Error ? err : new Error(String(err)),
        };
      }
    },
  },
};
