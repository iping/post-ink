import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Renders children only when the user is super_admin.
 * Otherwise redirects to /manage (or /login if not authenticated).
 */
export function SuperAdminRoute({ children }) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading…
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'super_admin') {
    return <Navigate to="/manage" replace />;
  }

  return children;
}