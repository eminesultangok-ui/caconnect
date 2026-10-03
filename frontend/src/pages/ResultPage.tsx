/**
 * ResultPage — Success or failure outcome via router state.
 * CONDITIONAL ACTIONS:
 *   success === true:  reference, StatusTag, self-service count, delete button, history link
 *   success === false: reason, StatusTag, "No record stored" message, "Notify me" button
 *
 * Refresh guard (capture-then-clear):
 *   1. location.state is captured into local React state once on mount.
 *   2. The browser history entry is immediately cleared (replaceState null).
 *   3. The component renders from the captured copy, not from location.state.
 *   4. If the captured copy is null (direct URL paste or refresh after clear),
 *      the guard redirects to /dashboard.
 * Uses: StatusTag component
 */

import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import type { ResultState, ReviewEntry, AdoptionStats } from '../types';
import StatusTag from '../components/ui/StatusTag';
import StepIndicator from '../components/ui/StepIndicator';
import WaveHeader from '../components/ui/WaveHeader';
import TabBar from '../components/ui/TabBar';
import { ordinal } from '../utils/ordinal';

interface ResultPageProps {
  reviews: ReviewEntry[];
  stats: AdoptionStats;
  onDelete: (reviewId: string) => void;
  onSignOut?: () => void;
}

export default function ResultPage({ reviews: _reviews, stats, onDelete, onSignOut }: ResultPageProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Capture location.state once on mount (initializer runs only once)
  const [capturedState] = useState<ResultState | null>(
    () => location.state as ResultState | null
  );

  // Clear the history entry so refresh loses the outcome
  useEffect(() => {
    window.history.replaceState(null, '');
  }, []);

  // Guard: redirect if no captured state
  useEffect(() => {
    if (!capturedState) navigate('/dashboard', { replace: true });
  }, [capturedState, navigate]);

  if (!capturedState) return null;

  const { success, reference, reason, selfServiceCount, eventStatus, eventSource } = capturedState;

  return (
    <div className="min-h-screen bg-white pb-16">
      <WaveHeader variant="full" onSignOut={onSignOut} />

      <main className="px-4 py-6">
        <StepIndicator current={4} />

        {success ? (
          /* ── SUCCESS SCREEN ────────────────────────────────────── */
          <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-success text-3xl" aria-hidden="true">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-brand-blue mb-2">Marked as reviewed!</h2>
            <p className="text-neutral-600 mb-4">Your review has been recorded.</p>

            <div className="inline-flex items-center gap-3 mb-4">
              <span className="text-sm text-neutral-500">Reference:</span>
              <span className="font-mono text-lg font-bold text-brand-blue">{reference}</span>
            </div>

            <div className="mb-4">
              <StatusTag status={eventStatus} source={eventSource} />
            </div>

            <div className="text-sm text-neutral-600 space-y-1 mb-6">
              <p>This is your <span className="font-semibold">{ordinal(selfServiceCount)}</span> self-service review — Operations contacts avoided: <span className="font-semibold">{selfServiceCount}</span></p>
              <p className="text-neutral-400">Total reviews: {stats.reviewedEvents} · Self-service rate: {stats.selfServiceRate}%</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => reference && onDelete(reference)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-danger text-danger hover:bg-red-50 transition-colors"
              >
                Delete this record
              </button>
              <Link
                to="/history"
                className="px-4 py-2 rounded-lg text-sm font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors text-center"
              >
                View review history
              </Link>
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-full text-sm font-medium bg-ink text-white hover:bg-ink/90 transition-colors text-center"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          /* ── FAILURE SCREEN ────────────────────────────────────── */
          <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-warning text-3xl" aria-hidden="true">✕</span>
            </div>
            <h2 className="text-2xl font-bold text-brand-blue mb-2">Sign-Off Blocked</h2>

            <div className="mb-4">
              <StatusTag status={eventStatus} source={eventSource} />
            </div>

            <p className="text-neutral-600 mb-4 max-w-md mx-auto">{reason}</p>
            <p className="text-sm text-neutral-500 mb-6">No record has been stored for this event.</p>

            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 rounded-full text-sm font-semibold bg-ink text-white hover:bg-ink/90 transition-colors"
            >
              Back to dashboard
            </button>
          </div>
        )}
      </main>

      <TabBar />
    </div>
  );
}