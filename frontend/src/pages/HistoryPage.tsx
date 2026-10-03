/**
 * HistoryPage — Review history list, newest-first.
 * Shows: security, event type, reference, date, account count, StatusTag, badge.
 * Summary line at top. Delete action per row. Empty state message.
 * Uses: FormSection, StatusTag components
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReviewEntry, AdoptionStats } from '../types';
import FormSection from '../components/ui/FormSection';
import StatusTag from '../components/ui/StatusTag';
import WaveHeader from '../components/ui/WaveHeader';
import TabBar from '../components/ui/TabBar';

interface HistoryPageProps {
  reviews: ReviewEntry[];
  stats: AdoptionStats;
  onDelete: (reviewId: string) => void;
  onSignOut?: () => void;
}

export default function HistoryPage({ reviews, stats, onDelete, onSignOut }: HistoryPageProps) {
  const navigate = useNavigate();

  // Sort newest-first
  const sorted = useMemo(
    () => [...reviews].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [reviews]
  );

  // Format date for display
  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  };

  return (
    <div className="min-h-screen bg-white pb-16">
      <WaveHeader variant="compact" onSignOut={onSignOut} />

      <button type="button" onClick={() => navigate(-1)} className="ml-4 mt-2 text-sm text-brand-blue hover:opacity-70">← Back</button>

      <main className="px-4 py-5">
        <h2 className="text-xl font-bold text-brand-blue mb-4">Review History</h2>

        {/* Summary line */}
        <p className="text-sm text-neutral-600 mb-6">
          {stats.reviewedEvents} reviews completed · {stats.selfServiceEvents} self-service ·{' '}
          <span className={stats.selfServiceRate >= 70 ? 'text-success font-semibold' : 'font-semibold'}>
            {stats.selfServiceRate}%
          </span>{' '}
          self-service rate (target 70%)
        </p>

        {sorted.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
            <p className="text-neutral-500">No reviews yet. Completed sign-offs will appear here and are retained for 14 days.</p>
          </div>
        ) : (
          <FormSection title="Completed Reviews">
            <div className="space-y-4">
              {sorted.map((review) => (
                <div key={review.reviewId} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 bg-neutral-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="font-semibold text-brand-blue text-sm">{review.security}</span>
                      <span className="text-xs text-neutral-500">·</span>
                      <span className="text-sm text-neutral-600">{review.eventType}</span>
                      <StatusTag status={review.eventStatus} source={review.eventSource} size="sm" />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 mt-1">
                      <span>Ref: <span className="font-mono text-neutral-700">{review.reviewId}</span></span>
                      <span>Reviewed: {fmtDate(review.timestamp)}</span>
                      <span>Accounts: {review.affectedAccountCount}</span>
                    </div>
                    {/* Self-service / Contacted Operations badge */}
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${review.contactedOps ? 'bg-amber-100 text-warning' : 'bg-green-100 text-success'}`}>
                      {review.contactedOps ? 'Contacted Operations' : 'Self-service'}
                    </span>
                  </div>
                  <button
                    onClick={() => onDelete(review.reviewId)}
                    className="text-xs text-danger hover:text-red-700 underline whitespace-nowrap"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </FormSection>
        )}
      </main>

      <TabBar />
    </div>
  );
}