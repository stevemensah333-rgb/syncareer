import { Navigate } from 'react-router-dom';

/**
 * Legacy single-purpose hub. /build only ever linked to the CV editor, so it
 * now redirects there; bookmarks stay valid without a transitional screen.
 */
export default function Build() {
  return <Navigate to="/cv-builder" replace />;
}
