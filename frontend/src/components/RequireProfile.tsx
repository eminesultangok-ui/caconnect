/**
 * RequireProfile — Route guard that redirects to /login when no user is present.
 * Wraps a page element; renders children only if currentUser is non-null.
 * While initialLoading is true and currentUser is still null, shows a spinner
 * instead of redirecting (avoids premature redirect on page refresh).
 */

import { Navigate } from 'react-router-dom';
import type { AdvisorProfile } from '../types';

interface RequireProfileProps {
  currentUser: AdvisorProfile | null;
  initialLoading?: boolean;
  children: React.ReactNode;
}

export default function RequireProfile({ currentUser, initialLoading, children }: RequireProfileProps) {
  if (!currentUser) {
    if (initialLoading) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-brand-blue" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-neutral-500">Loading…</p>
          </div>
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}