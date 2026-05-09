import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Password reset now lives at /sign-in/reset-password (Supabase flow).
// This page is kept as a catch for any older bookmarked /reset-password links
// and bounces users to the sign-in screen where they can use "Forgot password".
export default function ResetPassword() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/sign-in', { replace: true });
  }, [navigate]);

  return null;
}
