import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getCurrentSession, getSession } from '../../services/authService';
import LoadingState from './LoadingState';

export default function ProtectedRoute({ role }) {
  const [session, setSession] = useState(() => getSession());
  const [loading, setLoading] = useState(!getSession());
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    async function resolveSession() {
      try {
        const current = await getCurrentSession();
        if (mounted) setSession(current);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (!session) {
      resolveSession();
    }

    return () => {
      mounted = false;
    };
  }, [session]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center p-4">
        <LoadingState label="Oturum doğrulanıyor" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const allowed = session.role === role || (role === 'admin' && session.role === 'super_admin');

  if (!allowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
