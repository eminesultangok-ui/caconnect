/**
 * FormSection — Reusable wrapper for grouping form fields.
 * Used on: ProfileSetupPage, ReviewPage, ConfirmPage, HistoryPage
 * Renders a card with a title and optional description.
 *
 * tone="default" — white card (profile fields, review fields, consent)
 * tone="notice"  — tinted brand-blue background with a left accent border
 *                   (data-retention notice, regulatory disclosures)
 */

import type { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: 'default' | 'notice';
}

const toneStyles: Record<'default' | 'notice', string> = {
  default: 'bg-white border border-neutral-100',
  notice: 'bg-blue-50 border-l-4 border-l-brand-blue border border-neutral-100',
};

export default function FormSection({ title, description, children, tone = 'default' }: FormSectionProps) {
  return (
    <section className={`${toneStyles[tone]} rounded-lg p-5 mb-5`}>
      <h2 className="text-base font-semibold text-brand-blue mb-1">{title}</h2>
      {description && (
        <p className="text-sm text-neutral-500 mb-4">{description}</p>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}