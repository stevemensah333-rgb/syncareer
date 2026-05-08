import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Password reset is handled by Clerk's built-in flow.
// This page exists as a catch for any old Supabase reset links and redirects
// users to the Clerk sign-in page where they can use "Forgot password".
export default function ResetPassword() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/sign-in', { replace: true });
  }, [navigate]);

  return null;
}
