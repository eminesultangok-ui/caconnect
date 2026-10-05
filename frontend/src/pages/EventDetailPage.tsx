/**
 * EventDetailPage — Full event detail with StatusTag, explainer, cross-branch indicator.
 * Props: actions, reviews, profile, onBeginReview callback
 * Uses: StatusTag component
 * Note: "Begin Review" is ENABLED for all statuses. Amber warning shown for Preliminary/Pending.
 */

import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { CorporateAction, ReviewEntry, AdvisorProfile, ReviewDraft } from '../types';
import StatusTag from '../components/ui/StatusTag';
import IconButton from '../components/ui/IconButton';
import WaveHeader from '../components/ui/WaveHeader';
import TabBar from '../components/ui/TabBar';
import { crossBranchText } from '../utils/crossBranch';

interface EventDetailPageProps {
  actions: CorporateAction[];
  reviews: ReviewEntry[];
  profile: AdvisorProfile | null;
  reviewDraft: ReviewDraft;
  initialLoading?: boolean;
  alertsCount?: number;
  onBeginReview: (eventId: string, eventType: string, eventStatus: ReviewDraft['eventStatus'], eventSource: string) => void;
  onResetDraft: (eventId: string, eventType: string, eventStatus: ReviewDraft['eventStatus'], eventSource: string) => void;
  onEditProfile?: () => void;
  onSignOut?: () => void;
}

export default function EventDetailPage({ actions, reviews: _reviews, profile, reviewDraft, initialLoading, alertsCount = 0, onBeginReview, onResetDraft, onEditProfile, onSignOut }: EventDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const event = useMemo(() => actions.find((a) => a.id === id), [actions, id]);

  // Show spinner while data is loading; only show "Not Found" after load completes
  if (initialLoading && !event) {
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

  if (!event) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-brand-navy mb-2">Event Not Found</h2>
          <Link to="/dashboard" className="text-sm text-brand-navy underline">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  // Cross-branch text via helper
  const crossBranchMsg = crossBranchText(event.reviewedByBranches, profile?.branch);

  // Check if there is an in-progress draft for this event with non-empty values
  const hasDraftForThisEvent =
    reviewDraft.eventId === event.id &&
    (reviewDraft.affectedAccountCount > 0 || reviewDraft.election.trim().length > 0);

  return (
    <div className="min-h-screen bg-white pb-16">
      <WaveHeader variant="full" subtitle={event.security} onSignOut={onSignOut} onEditProfile={onEditProfile} />

      <button type="button" onClick={() => navigate(-1)} className="ml-4 mt-2 text-sm text-brand-blue hover:opacity-70">← Back</button>

      <main className="px-4 py-5">
        {/* Event Header with ticker avatar */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: event.avatarColor }}>
            <span className="text-white text-sm font-bold">{event.ticker}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-brand-blue">{event.security}</h2>
                <p className="text-xs text-neutral-500">{event.issuer} · {event.isin} · {event.market}</p>
              </div>
              <StatusTag status={event.status} source={event.source} />
            </div>
          </div>
        </div>

        {/* Event details grid */}
        <div className="bg-white rounded-lg border border-neutral-100 p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-neutral-400 text-xs">Event Type</span><p className="font-medium text-neutral-800">{event.eventType}</p></div>
            <div><span className="text-neutral-400 text-xs">Ratio</span><p className="font-medium text-neutral-800">{event.ratio}</p></div>
            <div><span className="text-neutral-400 text-xs">Ex-Date</span><p className="font-medium text-neutral-800">{event.exDate}</p></div>
            <div><span className="text-neutral-400 text-xs">Record Date</span><p className="font-medium text-neutral-800">{event.recordDate}</p></div>
            <div><span className="text-neutral-400 text-xs">Payment Date</span><p className="font-medium text-neutral-800">{event.paymentDate}</p></div>
            <div><span className="text-neutral-400 text-xs">Data Source</span><p className="font-medium text-neutral-800">{event.source}</p></div>
          </div>
        </div>

        {/* What does this mean? */}
        <div className="bg-brand-light border border-brand-blue/20 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-brand-blue mb-2">What does this mean?</h3>
          <p className="text-xs text-neutral-700 leading-relaxed">{event.plainEnglish}</p>
        </div>

        {/* Cross-branch indicator */}
        {crossBranchMsg && (
          <div className="bg-neutral-50 rounded-lg p-3 mb-4 text-xs text-neutral-600">
            {crossBranchMsg}
          </div>
        )}

        {/* Amber warning for Preliminary/Pending */}
        {(event.status === 'Preliminary' || event.status === 'Pending') && (
          <div className="bg-warning-light border border-amber-300 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <span className="text-warning text-sm" aria-hidden="true">⚠</span>
              <div>
                <p className="text-xs font-semibold text-warning mb-1">Figures not yet custodian-confirmed</p>
                <p className="text-xs text-neutral-700">These figures are not yet custodian-confirmed. You can review this event, but sign-off will be blocked until the custodian confirms the ratio and dates.</p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {hasDraftForThisEvent ? (
          <div className="flex gap-3">
            <IconButton label="Continue review" onClick={() => onBeginReview(event.id, event.eventType, event.status, event.source)} className="flex-1" />
            <button onClick={() => onResetDraft(event.id, event.eventType, event.status, event.source)} className="flex-1 py-2.5 px-4 rounded-full text-sm font-semibold border border-brand-blue text-brand-blue hover:bg-brand-blue/5 transition-colors">Start Over</button>
          </div>
        ) : (
          <IconButton label="Mark as reviewed" onClick={() => onBeginReview(event.id, event.eventType, event.status, event.source)} className="w-full" />
        )}
      </main>

      <TabBar alertsCount={alertsCount} />
    </div>
  );
}