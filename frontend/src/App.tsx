/**
 * CAConnect — App.tsx
 * Central state management + React Router v6 routes.
 *
 * Backend persistence:
 *   All data is fetched from and saved to the backend API.
 *   Token is stored in localStorage (learning project).
 *   In production, tokens should be stored more securely.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import type { CorporateAction, AdvisorProfile, ReviewEntry, ReviewDraft, AdoptionStats, ResultState } from './types';
import { AuthError } from './lib/api';
import * as api from './lib/api';
import LoginPage from './pages/LoginPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import DashboardPage from './pages/DashboardPage';
import EventDetailPage from './pages/EventDetailPage';
import ReviewPage from './pages/ReviewPage';
import ConfirmPage from './pages/ConfirmPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';
import RequireProfile from './components/RequireProfile';

const emptyDraft: ReviewDraft = {
  eventId: '', eventType: '', eventStatus: 'Custodian-confirmed',
  eventSource: '', affectedAccountCount: 0, election: '',
  notes: '', contactedOps: false, opsReason: undefined,
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<AdvisorProfile | null>(null);
  const [reviews, setReviews] = useState<ReviewEntry[]>([]);
  const [corporateActions, setCorporateActions] = useState<CorporateAction[]>([]);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>({ ...emptyDraft });
  const [initialLoading, setInitialLoading] = useState(true);

  // ─── Pure data loader — no navigation, just state updates ──
  // Returns 'Complete' | 'Incomplete' | 'AuthError' so callers decide where to go.
  const loadAllData = useCallback(async (aborted: { value: boolean }): Promise<'Complete' | 'Incomplete' | 'AuthError'> => {
    try {
      const [profileData, actionsData, reviewsData] = await Promise.all([
        api.getProfile(), api.getCorporateActions(), api.getReviews(),
      ]);
      if (aborted.value) return 'Incomplete';
      setCurrentUser({
        name: profileData.name ?? '', branch: profileData.branch ?? '',
        markets: profileData.markets ?? [],
        notificationPref: (profileData.notificationPref as AdvisorProfile['notificationPref']) ?? 'email',
      });
      setCorporateActions(actionsData);
      setReviews(reviewsData);
      return profileData.isComplete ? 'Complete' : 'Incomplete';
    } catch (err) {
      if (aborted.value) return 'Incomplete';
      if (err instanceof AuthError) {
        api.clearToken(); setCurrentUser(null);
        return 'AuthError';
      }
      console.error('Failed to load data:', err);
      return 'Incomplete';
    }
  }, []); // no navigate dependency — this function is pure

  // Stable ref so the mount effect never re-fires when navigate changes.
  const loadAllDataRef = useRef(loadAllData);
  loadAllDataRef.current = loadAllData;

  // ─── Mount: check token, load data, navigate once if needed ──
  useEffect(() => {
    const token = api.getToken();
    if (!token) { setInitialLoading(false); return; }
    let cancelled = false;
    const aborted = { value: false };
    loadAllDataRef.current(aborted).then((result) => {
      if (cancelled) return;
      // Only navigate on mount, and only from /login or /
      if (result === 'Complete' && ['/login', '/'].includes(location.pathname)) {
        navigate('/dashboard', { replace: true });
      } else if (result === 'AuthError') {
        navigate('/login', { replace: true });
      }
    }).finally(() => {
      if (!cancelled) setInitialLoading(false);
    });
    return () => { cancelled = true; aborted.value = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty deps — runs once on mount

  // ─── Computed stats ───────────────────────────────
  const stats: AdoptionStats = useMemo(() => {
    const reviewedEventIds = new Set(reviews.map((r) => r.eventId));
    const selfServiceReviews = reviews.filter((r) => !r.contactedOps);
    const selfServiceEventIds = new Set(selfServiceReviews.map((r) => r.eventId));
    const rate = reviewedEventIds.size > 0
      ? Math.round((selfServiceEventIds.size / reviewedEventIds.size) * 100)
      : 0;
    const personal = reviews.filter((r) => r.advisorName === currentUser?.name && !r.contactedOps).length;
    return {
      totalEvents: corporateActions.length,
      reviewedEvents: reviewedEventIds.size,
      selfServiceEvents: selfServiceEventIds.size,
      selfServiceRate: rate, selfServiceCount: personal, opsContactsAvoided: personal,
    };
  }, [reviews, currentUser, corporateActions.length]);

  // ─── Sign out ─────────────────────────────────────
  const handleSignOut = useCallback(() => {
    api.clearToken();
    setCurrentUser(null); setReviews([]); setCorporateActions([]);
    setReviewDraft({ ...emptyDraft });
    navigate('/login', { replace: true });
  }, [navigate]);
  // ─── Login / Sign-up ──────────────────────────────
  const handleLogin = useCallback(async (
    email: string, password: string, isSignUp: boolean
  ): Promise<boolean> => {
    const resp = isSignUp ? await api.signup(email, password) : await api.login(email, password);
    api.setToken(resp.access_token);
    const result = await loadAllData({ value: false });
    if (result === 'AuthError') throw new Error('Authentication failed');
    return result === 'Complete';
  }, [loadAllData]);
  // ─── Profile setup ────────────────────────────────
  const handleProfileComplete = useCallback(async (profile: AdvisorProfile) => {
    await api.updateProfile({
      name: profile.name, branch: profile.branch,
      markets: profile.markets, notificationPref: profile.notificationPref,
    });
    setCurrentUser(profile);
    try { setReviews(await api.getReviews()); } catch { /* non-critical */ }
    navigate('/dashboard');
  }, [navigate]);

  // ─── Draft handlers (unchanged logic) ─────────────
  const handleBeginReview = useCallback((eventId: string, eventType: string, eventStatus: ReviewDraft['eventStatus'], eventSource: string) => {
    if (eventId !== reviewDraft.eventId) {
      setReviewDraft({ ...emptyDraft, eventId, eventType, eventStatus, eventSource });
    }
    navigate(`/event/${eventId}/review`);
  }, [navigate, reviewDraft.eventId]);

  const handleResetDraft = useCallback((eventId: string, eventType: string, eventStatus: ReviewDraft['eventStatus'], eventSource: string) => {
    setReviewDraft({ ...emptyDraft, eventId, eventType, eventStatus, eventSource });
    navigate(`/event/${eventId}/review`);
  }, [navigate]);

  const handleDraftChange = useCallback((updates: Partial<ReviewDraft>) => {
    setReviewDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleReviewSubmit = useCallback(() => { navigate('/confirm'); }, [navigate]);
  // ─── Confirm sign-off (calls backend) ─────────────
  const handleConfirm = useCallback(async () => {
    try {
      const result = await api.submitReview({
        eventId: reviewDraft.eventId,
        affectedAccountCount: reviewDraft.affectedAccountCount,
        election: reviewDraft.election,
        notes: reviewDraft.notes,
        contactedOps: reviewDraft.contactedOps,
        opsReason: reviewDraft.opsReason,
      });
      // Refresh reviews state from backend (no redirect)
      try { setReviews(await api.getReviews()); } catch { /* use optimistic update below */ }
      if (result.success) {
        // Optimistic add in case the GET was slow
        setReviews((prev) => {
          if (prev.some((r) => r.reviewId === result.review.reviewId)) return prev;
          return [...prev, result.review];
        });
        navigate('/result', { state: {
          success: true, reference: result.reference,
          selfServiceCount: result.selfServiceCount,
          eventStatus: result.eventStatus, eventSource: result.eventSource,
        } as ResultState });
      } else {
        navigate('/result', { state: {
          success: false, reason: result.reason,
          selfServiceCount: result.selfServiceCount,
          eventStatus: result.eventStatus, eventSource: result.eventSource,
        } as ResultState });
      }
    } catch (err) {
      if (err instanceof AuthError) { handleSignOut(); return; }
      console.error('Submit review failed:', err);
    }
  }, [reviewDraft, handleSignOut, navigate]);

  // ─── Delete review (calls backend) ────────────────
  const handleDeleteReview = useCallback(async (reviewId: string) => {
    try {
      await api.deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.reviewId !== reviewId));
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof AuthError) { handleSignOut(); return; }
      console.error('Delete review failed:', err);
    }
  }, [handleSignOut, navigate]);

  // ─── Routes ───────────────────────────────────────
  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={handleLogin} initialLoading={initialLoading} />} />
      <Route path="/setup" element={<RequireProfile currentUser={currentUser} initialLoading={initialLoading}><ProfileSetupPage profile={currentUser} onComplete={handleProfileComplete} onSignOut={handleSignOut} /></RequireProfile>} />
      <Route path="/dashboard" element={<RequireProfile currentUser={currentUser} initialLoading={initialLoading}><DashboardPage actions={corporateActions} reviews={reviews} profile={currentUser} stats={stats} onSignOut={handleSignOut} /></RequireProfile>} />
      <Route path="/event/:id" element={<RequireProfile currentUser={currentUser} initialLoading={initialLoading}><EventDetailPage actions={corporateActions} reviews={reviews} profile={currentUser} reviewDraft={reviewDraft} initialLoading={initialLoading} onBeginReview={handleBeginReview} onResetDraft={handleResetDraft} onSignOut={handleSignOut} /></RequireProfile>} />
      <Route path="/event/:id/review" element={<RequireProfile currentUser={currentUser} initialLoading={initialLoading}><ReviewPage draft={reviewDraft} actions={corporateActions} profile={currentUser} initialLoading={initialLoading} onChange={handleDraftChange} onSubmit={handleReviewSubmit} onSignOut={handleSignOut} /></RequireProfile>} />
      <Route path="/confirm" element={<RequireProfile currentUser={currentUser} initialLoading={initialLoading}><ConfirmPage draft={reviewDraft} actions={corporateActions} profile={currentUser} onConfirm={handleConfirm} onSignOut={handleSignOut} /></RequireProfile>} />
      <Route path="/result" element={<RequireProfile currentUser={currentUser} initialLoading={initialLoading}><ResultPage reviews={reviews} stats={stats} onDelete={handleDeleteReview} onSignOut={handleSignOut} /></RequireProfile>} />
      <Route path="/history" element={<RequireProfile currentUser={currentUser} initialLoading={initialLoading}><HistoryPage reviews={reviews} stats={stats} onDelete={handleDeleteReview} onSignOut={handleSignOut} /></RequireProfile>} />
      <Route path="*" element={<LoginPage onLogin={handleLogin} initialLoading={initialLoading} />} />
    </Routes>
  );
}