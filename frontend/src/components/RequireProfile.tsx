/**
 * RequireProfile — Route guard that redirects to /login when no user is present.
 * Wraps a page element; renders children only if currentUser is non-null.
 */

import { Navigate } from 'react-router-dom';
import type { AdvisorProfile } from '../types';

interface RequireProfileProps {
  currentUser: AdvisorProfile | null;
  children: React.ReactNode;
}

export default function RequireProfile({ currentUser, children }: RequireProfileProps) {
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}