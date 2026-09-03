import { Navigate } from 'react-router-dom';

/**
 * Legacy single-purpose hub. /apply pointed at opportunity discovery and the
 * application index; discovery remains the entry point, so it redirects to
 * /opportunities.
 */
export default function Apply() {
  return <Navigate to="/opportunities" replace />;
}
