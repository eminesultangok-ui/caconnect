/**
 * HelpPage — Help & FAQ page.
 * Two collapsible sections built with FormSection: "Using CAConnect" and
 * "Event types and statuses". All text stored in lib/constants.ts.
 * Uses: WaveHeader, FormSection, TabBar components
 */

import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import FormSection from '../components/ui/FormSection';
import WaveHeader from '../components/ui/WaveHeader';
import TabBar from '../components/ui/TabBar';
import { HELP_FAQ_USING, HELP_EVENT_TYPES } from '../lib/constants';

interface HelpPageProps {
  alertsCount?: number;
  onEditProfile?: () => void;
  onSignOut?: () => void;
}

function FaqDetails({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-b border-neutral-100 last:border-b-0">
      <summary className="flex items-center justify-between gap-2 py-3 cursor-pointer text-sm font-medium text-neutral-800 hover:text-brand-blue list-none select-none">
        <span>{question}</span>
        <ChevronDown
          size={16}
          className="text-neutral-400 transition-transform duration-200 group-open:rotate-180 flex-shrink-0"
        />
      </summary>
      <p className="pb-3 pr-6 text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
        {answer}
      </p>
    </details>
  );
}

export default function HelpPage({ alertsCount = 0, onEditProfile, onSignOut }: HelpPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white pb-16">
      <WaveHeader variant="compact" onSignOut={onSignOut} onEditProfile={onEditProfile} />

      <button type="button" onClick={() => navigate(-1)} className="ml-4 mt-2 text-sm text-brand-blue hover:opacity-70">← Back</button>

      <main className="px-4 py-5">
        <h2 className="text-xl font-bold text-brand-blue mb-5">Help & FAQ</h2>

        <FormSection title="Using CAConnect">
          {HELP_FAQ_USING.map((item) => (
            <FaqDetails key={item.question} question={item.question} answer={item.answer} />
          ))}
        </FormSection>

        <FormSection title="Event types and statuses">
          {HELP_EVENT_TYPES.map((item) => (
            <FaqDetails key={item.question} question={item.question} answer={item.answer} />
          ))}
        </FormSection>
      </main>

      <TabBar alertsCount={alertsCount} />
    </div>
  );
}