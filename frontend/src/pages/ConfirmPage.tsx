/**
 * ConfirmPage — Summary + data retention notice + explicit consent.
 * Shows 6 stored fields, StatusTag in consent statement, unticked checkbox.
 * Props: draft, actions, profile, onConfirm callback
 * Uses: FormSection, StatusTag components
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReviewDraft, CorporateAction, AdvisorProfile } from '../types';
import FormSection from '../components/ui/FormSection';
import StatusTag from '../components/ui/StatusTag';
import StepIndicator from '../components/ui/StepIndicator';
import IconButton from '../components/ui/IconButton';
import WaveHeader from '../components/ui/WaveHeader';

interface ConfirmPageProps {
  draft: ReviewDraft;
  actions: CorporateAction[];
  profile: AdvisorProfile | null;
  onConfirm: () => void;
  onSignOut?: () => void;
}

export default function ConfirmPage({ draft, actions, profile, onConfirm, onSignOut }: ConfirmPageProps) {
  const navigate = useNavigate();
  const [consented, setConsented] = useState(false);

  const event = useMemo(() => actions.find((a) => a.id === draft.eventId), [actions, draft.eventId]);

  // Clear any stale history state on mount
  useEffect(() => {
    window.history.replaceState(null, '');
  }, []);

  // Guard — event and profile come from App state, which resets on refresh
  useEffect(() => {
    if (!event || !profile) navigate('/dashboard', { replace: true });
  }, [event, profile, navigate]);

  if (!event || !profile) return null;

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!consented) return;
    onConfirm();
  }, [consented, onConfirm]);

  return (
    <div className="min-h-screen bg-white">
      <WaveHeader variant="compact" onSignOut={onSignOut} />

      <button type="button" onClick={() => navigate(-1)} className="ml-4 mt-2 text-sm text-brand-blue hover:opacity-70">← Back</button>

      <main className="page-container">
        <StepIndicator current={3} />

        <h2 className="text-xl font-bold text-brand-blue mb-5">Confirm Sign-Off</h2>

        {/* Summary of what will be submitted */}
        <FormSection title="Review Summary">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><span className="text-neutral-500">Security:</span> <span className="font-medium">{event.security}</span></div>
            <div><span className="text-neutral-500">Event Type:</span> <span className="font-medium">{event.eventType}</span></div>
            <div><span className="text-neutral-500">Affected Accounts:</span> <span className="font-medium">{draft.affectedAccountCount}</span></div>
            <div><span className="text-neutral-500">Election:</span> <span className="font-medium">{draft.election}</span></div>
            {draft.notes && <div className="sm:col-span-2"><span className="text-neutral-500">Notes:</span> <span className="font-medium">{draft.notes}</span></div>}
            <div><span className="text-neutral-500">Contacted Operations:</span> <span className="font-medium">{draft.contactedOps ? `Yes — ${draft.opsReason ?? 'reason not specified'}` : 'No'}</span></div>
          </div>
        </FormSection>

        {/* Data Retention Notice */}
        <FormSection title="Data Retention Notice" description="What we store and for how long." tone="notice">
          <div className="bg-neutral-50 rounded-lg p-4 text-sm text-neutral-700 space-y-3">
            <div>
              <p className="font-medium text-neutral-800 mb-1">About you</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>Advisor name</li>
                <li>Branch</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-neutral-800 mb-1">About this review</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>Event ID and security name</li>
                <li>Event type</li>
                <li>Status at time of review</li>
                <li>Affected account count</li>
                <li>Election decision</li>
                <li>Whether Operations was contacted (and why, if yes)</li>
                <li>Your notes</li>
                <li>Reference number</li>
                <li>Timestamp</li>
              </ul>
            </div>
            <p className="text-neutral-500">No client-identifying data is stored. Records are retained for 14 days.</p>
          </div>
        </FormSection>

        {/* Consent Checkbox with StatusTag */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-1 text-brand-navy focus:ring-brand-navy rounded"
              />
              <span className="text-sm text-neutral-700">
                I confirm I have reviewed this corporate action and understand the figures shown are{' '}
                <StatusTag status={event.status} source={event.source} size="sm" />.
              </span>
            </label>
          </div>

          <IconButton label="Confirm and record" type="submit" disabled={!consented} className="w-full" />
        </form>
      </main>
    </div>
  );
}