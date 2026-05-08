import { useAuth, useUser } from '@clerk/react';

export type CompatSession = {
  user: {
    id: string;
    email: string;
    user_metadata: { full_name?: string; avatar_url?: string };
    app_metadata: Record<string, unknown>;
  };
  access_token: string;
} | null;

let _getToken: (() => Promise<string | null>) | null = null;
let _userId: string | null = null;
let _userEmail: string | null = null;
let _userFullName: string | null = null;
let _userAvatarUrl: string | null = null;
let _isSignedIn = false;

export function setAuthState(state: {
  getToken: () => Promise<string | null>;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  isSignedIn: boolean;
}) {
  _getToken = state.getToken;
  _userId = state.userId;
  _userEmail = state.email;
  _userFullName = state.fullName;
  _userAvatarUrl = state.avatarUrl;
  _isSignedIn = state.isSignedIn;
}

export async function getCompatSession(): Promise<{ data: { session: CompatSession } }> {
  if (!_isSignedIn || !_userId) {
    return { data: { session: null } };
  }
  const token = _getToken ? await _getToken() : null;
  return {
    data: {
      session: {
        user: {
          id: _userId,
          email: _userEmail ?? '',
          user_metadata: {
            full_name: _userFullName ?? '',
            avatar_url: _userAvatarUrl ?? '',
          },
          app_metadata: {},
        },
        access_token: token ?? '',
      },
    },
  };
}

export async function getCompatUser(): Promise<{ data: { user: CompatSession['user'] | null } }> {
  const { data: { session } } = await getCompatSession();
  return { data: { user: session?.user ?? null } };
}

export function useAuthSyncToCompat() {
  const { isSignedIn, isLoaded, userId, getToken } = useAuth();
  const { user } = useUser();

  if (isLoaded) {
    setAuthState({
      getToken,
      userId: userId ?? null,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      fullName: user?.fullName ?? null,
      avatarUrl: user?.imageUrl ?? null,
      isSignedIn: !!isSignedIn,
    });
  }

  return { isSignedIn, isLoaded };
}
