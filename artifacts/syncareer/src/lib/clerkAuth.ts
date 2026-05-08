import { useAuth, useUser } from '@clerk/react';

export function useClerkSession() {
  const { isSignedIn, isLoaded, userId, getToken } = useAuth();
  const { user } = useUser();

  const getSession = async () => {
    if (!isLoaded || !isSignedIn || !userId) return null;
    const token = await getToken();
    return {
      user: {
        id: userId,
        email: user?.primaryEmailAddress?.emailAddress ?? '',
        user_metadata: {
          full_name: user?.fullName ?? '',
          avatar_url: user?.imageUrl ?? '',
        },
        app_metadata: {},
      },
      access_token: token ?? '',
    };
  };

  return { isSignedIn, isLoaded, userId, getSession };
}
