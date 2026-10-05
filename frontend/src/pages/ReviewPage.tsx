/**
 * ReviewPage — Review form: affected accounts, election, notes, ops contact question.
 * Reads draft from props, writes through onChange. No mount-time draft initialization.
 * Uses: FormSection, TextField, StepIndicator components
 *
 * Election field behaviour:
 *   Mandatory events (single option) — shown as read-only text with a note.
 *   Voluntary events (multiple options) — dropdown, user must choose one.
 *   Unknown event type — friendly error message, form blocked.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { CorporateAction, ReviewDraft, AdvisorProfile } from '../types';
import FormSection from '../components/ui/FormSection';
import TextField from '../components/ui/TextField';
import StepIndicator from '../components/ui/StepIndicator';
import WaveHeader from '../components/ui/WaveHeader';
import {
  EVENT_ELECTIONS,
  isMandatoryEvent,
  ELECTION_EXPLANATIONS,
  UNKNOWN_EVENT_TYPE_MESSAGE,
} from '../lib/constants';

const OPS_REASONS = ['Unclear terminology', 'Figure looked wrong', 'Needed client-level impact', 'Other'];

interface ReviewPageProps {
  draft: ReviewDraft;
  actions: CorporateAction[];
  profile: AdvisorProfile | null;
  initialLoading?: boolean;
  onChange: (updates: Partial<ReviewDraft>) => void;
  onSubmit: () => void;
  onSignOut?: () => void;
}

export default function ReviewPage({ draft, actions, profile, initialLoading, onChange, onSubmit, onSignOut }: ReviewPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [touched, setTouched] = useState({ affectedAccountCount: false, election: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const event = useMemo(() => actions.find((a) => a.id === id), [actions, id]);

  // Clear any stale history state on mount
  useEffect(() => {
    window.history.replaceState(null, '');
  }, []);

  // Guard — profile and draft come from App state, which resets on refresh.
  // Wait for initial data load to finish before redirecting (matches A2 pattern).
  useEffect(() => {
    if (initialLoading) return;
    if (!profile || !draft.eventId) navigate('/dashboard', { replace: true });
  }, [initialLoading, profile, draft.eventId, navigate]);

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
  if (!profile || !draft.eventId) return null;
  if (!event) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-brand-navy mb-2">Event Not Found</h2>
        </div>
      </div>
    );
  }

  // Election logic derived from event type
  const eventType = event.eventType;
  const electionOptions = EVENT_ELECTIONS[eventType] as string[] | undefined;
  const isUnknown = !electionOptions;
  const mandatory = !isUnknown && isMandatoryEvent(eventType);

  const handleBlur = useCallback((field: 'affectedAccountCount' | 'election') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // Bug2 fix: error strings gated on touched
  const countError = touched.affectedAccountCount && draft.affectedAccountCount <= 0
    ? 'Enter at least 1 affected account' : '';
  const electionError = touched.election && !draft.election.trim()
    ? 'Please select an election option' : '';
  const isValid = draft.affectedAccountCount > 0 && draft.election.trim().length > 0 && !isUnknown;

  // Build contextual help items for the current event type's options
  const helpItems = useMemo(() => {
    if (isUnknown) return [];
    return (electionOptions as string[])
      .map((opt) => ({ option: opt, explanation: ELECTION_EXPLANATIONS[opt] }))
      .filter((item) => !!item.explanation);
  }, [electionOptions, isUnknown]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    onSubmit();
  }, [isValid, isSubmitting, onSubmit]);

  return (
    <div className="min-h-screen bg-white">
      <WaveHeader variant="compact" onSignOut={onSignOut} />

      <button type="button" onClick={() => navigate(-1)} className="ml-4 mt-2 text-sm text-brand-blue hover:opacity-70">← Back</button>

      <main className="page-container">
        <StepIndicator current={2} />

        <h2 className="text-xl font-bold text-brand-blue mb-1">Review: {event.security}</h2>
        <p className="text-sm text-neutral-500 mb-6">{event.eventType} <span className={`inline-block align-middle px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none border ${mandatory ? 'bg-neutral-100 text-neutral-600 border-neutral-200' : 'bg-brand-blue text-white border-brand-blue'}`} title={mandatory ? 'Happens automatically \u2014 no client instruction needed.' : 'The client must choose an option before the deadline.'}>{mandatory ? 'Mandatory' : 'Voluntary'}</span> · {event.market} · {event.id}</p>

        <form onSubmit={handleSubmit}>
          <FormSection title="Client Impact" description="Record the number of affected client accounts and your election decision.">
            <TextField label="Affected client account count" value={draft.affectedAccountCount > 0 ? String(draft.affectedAccountCount) : ''} onChange={(val) => onChange({ affectedAccountCount: parseInt(val) || 0 })} onBlur={() => handleBlur('affectedAccountCount')} error={countError} touched={touched.affectedAccountCount} type="number" placeholder="e.g. 42" helperText="We record the count only — never client names, account numbers, or holdings." required id="review-count" />
            {/* ── Election field ─────────────────────────────── */}
            {isUnknown ? (
              /* Unknown event type — friendly error */
              <div className="rounded-md bg-warning-light border border-amber-300 p-4">
                <p className="text-sm text-warning font-medium">{UNKNOWN_EVENT_TYPE_MESSAGE}</p>
              </div>
            ) : mandatory ? (
              /* Mandatory event — read-only text */
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Election decision<span className="text-danger ml-0.5">*</span>
                </label>
                <div className="w-full px-3 py-2 rounded-md border border-neutral-200 bg-neutral-50 text-sm text-neutral-700">
                  {draft.election}
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  This is a mandatory event — no client instruction is needed.
                </p>
              </div>
            ) : (
              /* Voluntary event — dropdown, user must choose */
              <div>
                <label htmlFor="review-election" className="block text-sm font-medium text-neutral-700 mb-1">
                  Election decision<span className="text-danger ml-0.5">*</span>
                </label>
                <select
                  id="review-election"
                  value={draft.election}
                  onChange={(e) => onChange({ election: e.target.value })}
                  onBlur={() => handleBlur('election')}
                  className={`w-full px-3 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${
                    touched.election && electionError
                      ? 'border-danger focus:ring-danger focus:border-danger'
                      : 'border-neutral-300'
                  }`}
                >
                  <option value="">Select an election</option>
                  {(electionOptions as string[]).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {touched.election && electionError && (
                  <p className="text-xs text-danger mt-1">{electionError}</p>
                )}
              </div>
            )}

            {/* ── Contextual help box ────────────────────────── */}
            {helpItems.length > 0 && (
              <details className="group border border-neutral-200 rounded-lg overflow-hidden">
                <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-sm font-medium text-brand-blue hover:bg-neutral-50 list-none select-none">
                  <ChevronDown
                    size={16}
                    className="text-neutral-400 transition-transform duration-200 group-open:rotate-180"
                  />
                  What do these options mean?
                </summary>
                <div className="px-4 pb-4 space-y-3">
                  {helpItems.map((item) => (
                    <div key={item.option}>
                      <p className="text-sm font-medium text-neutral-800">{item.option}</p>
                      <p className="text-sm text-neutral-600 leading-relaxed">{item.explanation}</p>
                    </div>
                  ))}
                  <div className="border-t border-neutral-100 pt-3 mt-3">
                    <p className="text-xs text-neutral-500">
                      This explains the instruction, not investment advice. Confirm the choice with your client.{' '}
                      <Link to="/help" className="text-brand-blue underline hover:opacity-70">
                        More questions? See Help & FAQ
                      </Link>
                    </p>
                  </div>
                </div>
              </details>
            )}

            <TextField label="Advisor notes (Optional)" value={draft.notes} onChange={(val) => onChange({ notes: val })} placeholder="Any additional observations or context for Operations" helperText="Do not include client names, account numbers or holdings." maxLength={200} id="review-notes" />
          </FormSection>

          <FormSection title="Operations Contact" description="This question helps us measure whether CAConnect is reducing the need to phone Operations.">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Did you need to contact Operations about this event? <span className="text-danger">*</span></label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="contactedOps" checked={!draft.contactedOps} onChange={() => onChange({ contactedOps: false, opsReason: undefined })} className="text-brand-blue focus:ring-brand-blue" /><span className="text-sm text-neutral-700">No</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="contactedOps" checked={draft.contactedOps} onChange={() => onChange({ contactedOps: true })} className="text-brand-blue focus:ring-brand-blue" /><span className="text-sm text-neutral-700">Yes</span></label>
              </div>
            </div>
            {draft.contactedOps && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Reason for contacting Operations</label>
                <select value={draft.opsReason ?? ''} onChange={(e) => onChange({ opsReason: e.target.value || undefined })} className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
                  <option value="">Select a reason</option>
                  {OPS_REASONS.map((r) => (<option key={r} value={r}>{r}</option>))}
                </select>
              </div>
            )}
          </FormSection>

          <button type="submit" disabled={!isValid || isSubmitting} className={`w-full py-2.5 px-4 rounded-full text-sm font-semibold transition-colors duration-200 ${isValid && !isSubmitting ? 'bg-ink text-white hover:bg-ink/90' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}>{isSubmitting ? 'Continuing…' : 'Continue'}</button>
        </form>
      </main>
    </div>
  );
}