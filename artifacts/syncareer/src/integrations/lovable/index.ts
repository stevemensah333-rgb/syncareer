export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: string, _opts?: unknown) => {
      return { error: new Error('OAuth via Lovable is not supported on Replit. Use the Sign In button.') };
    },
  },
};
