import { Navigate } from 'react-router-dom';

/**
 * Legacy single-purpose hub. /practice pointed primarily at interview
 * practice, which now lives at /interview-simulator (or inside an
 * application dossier at /applications/:id/interview).
 */
export default function Practice() {
  return <Navigate to="/interview-simulator" replace />;
}
