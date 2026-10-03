/**
 * StatusTag — Displays corporate action status with data source.
 *
 * Used on: DashboardPage, EventDetailPage, ConfirmPage, ResultPage, HistoryPage
 *
 * Always shows status + source together (e.g. "Custodian-confirmed · Clearstream")
 * for transparency per ethics-by-design requirement.
 *
 * An aria-label and native title tooltip spell out the full meaning so that
 * screen-reader users and hovering advisors alike understand the implication:
 *   • Custodian-confirmed — figures are final
 *   • Preliminary / Pending — figures may still change
 */

import type { CorporateAction } from '../../types';

interface StatusTagProps {
  status: CorporateAction['status'];
  source: string;
  size?: 'sm' | 'md';
}

function describe(status: CorporateAction['status'], source: string): string {
  switch (status) {
    case 'Custodian-confirmed':
      return `Custodian-confirmed by ${source}: figures are final`;
    case 'Preliminary':
      return `Preliminary from ${source}: figures may still change`;
    case 'Pending':
      return `Pending from ${source}: figures may still change`;
  }
}

export default function StatusTag({ status, source, size = 'md' }: StatusTagProps) {
  // Map status to colour tokens
  const statusStyles: Record<CorporateAction['status'], string> = {
    'Custodian-confirmed': 'bg-success-light text-success border-green-200',
    'Preliminary':         'bg-warning-light text-warning border-amber-200',
    'Pending':             'bg-neutral-100 text-neutral-600 border-neutral-200',
  };

  const sizeStyles = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  const meaning = describe(status, source);

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${statusStyles[status]}
        ${sizeStyles}
      `}
      aria-label={meaning}
      title={meaning}
    >
      {/* Status indicator dot */}
      <span
        className={`
          inline-block w-2 h-2 rounded-full
          ${status === 'Custodian-confirmed' ? 'bg-success' : ''}
          ${status === 'Preliminary' ? 'bg-warning' : ''}
          ${status === 'Pending' ? 'bg-neutral-400' : ''}
        `}
        aria-hidden="true"
      />
      {status} · {source}
    </span>
  );
}