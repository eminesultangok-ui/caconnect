/**
 * AlertsPage — Date-based alerts showing upcoming key dates across all events.
 * Answers "what is coming up soon?" for every corporate action (all markets).
 * Uses local date parsing (YYYY-MM-DD) to avoid UTC shift.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle } from 'lucide-react';
import type { CorporateAction, ReviewEntry, AdvisorProfile } from '../types';
import StatusTag from '../components/ui/StatusTag';
import WaveHeader from '../components/ui/WaveHeader';
import TabBar from '../components/ui/TabBar';

interface AlertsPageProps {
  actions: CorporateAction[];
  reviews: ReviewEntry[];
  profile: AdvisorProfile | null;
  alertsCount?: number;
  onEditProfile?: () => void;
  onSignOut?: () => void;
}

type DateLabel = 'Ex-date' | 'Record date' | 'Payment date';
const DATE_LABELS: DateLabel[] = ['Ex-date', 'Record date', 'Payment date'];
const DATE_FIELDS: (keyof CorporateAction)[] = ['exDate', 'recordDate', 'paymentDate'];

interface AlertItem { action: CorporateAction; dateLabel: DateLabel; dateStr: string; daysUntil: number; }
interface AlertGroup { action: CorporateAction; primary: AlertItem; others: AlertItem[]; }

function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysUntil(iso: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((parseLocal(iso).getTime() - today.getTime()) / 86_400_000);
}

function countdown(n: number): string {
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return `In ${n} days`;
}

function fmtDate(iso: string): string {
  return parseLocal(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function hint(a: CorporateAction, reviewed: Set<string>): string {
  if (a.status === 'Preliminary' || a.status === 'Pending') return 'Awaiting custodian confirmation';
  return reviewed.has(a.id) ? 'Reviewed ✓' : 'Ready for your review';
}

export function computeAlertsCount(actions: CorporateAction[]): number {
  let n = 0;
  for (const a of actions) {
    for (const f of DATE_FIELDS) {
      const d = daysUntil(a[f] as string);
      if (d >= 0 && d <= 14) { n++; break; }
    }
  }
  return n;
}

export default function AlertsPage({ actions, reviews, alertsCount = 0, onEditProfile, onSignOut }: AlertsPageProps) {
  const navigate = useNavigate();
  const reviewedIds = useMemo(() => new Set(reviews.map((r) => r.eventId)), [reviews]);

  const { inWindow, futureFallback } = useMemo(() => {
    const groups = new Map<string, AlertGroup>();
    for (const a of actions) {
      const items: AlertItem[] = [];
      for (let i = 0; i < 3; i++) {
        const du = daysUntil(a[DATE_FIELDS[i]] as string);
        if (du >= 0 && du <= 14) items.push({ action: a, dateLabel: DATE_LABELS[i], dateStr: a[DATE_FIELDS[i]] as string, daysUntil: du });
      }
      if (items.length > 0) {
        items.sort((x, y) => x.daysUntil - y.daysUntil);
        groups.set(a.id, { action: a, primary: items[0], others: items.slice(1) });
      }
    }
    const inWindow = [...groups.values()].sort((a, b) => a.primary.daysUntil - b.primary.daysUntil);
    let futureFallback: AlertItem[] = [];
    if (inWindow.length === 0) {
      const all: AlertItem[] = [];
      for (const a of actions) {
        for (let i = 0; i < 3; i++) {
          const du = daysUntil(a[DATE_FIELDS[i]] as string);
          if (du > 14) all.push({ action: a, dateLabel: DATE_LABELS[i], dateStr: a[DATE_FIELDS[i]] as string, daysUntil: du });
        }
      }
      all.sort((x, y) => x.daysUntil - y.daysUntil);
      futureFallback = all.slice(0, 3);
    }
    return { inWindow, futureFallback };
  }, [actions]);

  return (
    <div className="min-h-screen bg-white pb-16">
      <WaveHeader variant="compact" onSignOut={onSignOut} onEditProfile={onEditProfile} />
      <main className="px-4 py-5">
        <h2 className="text-xl font-bold text-brand-blue mb-4">Alerts</h2>
        {inWindow.length > 0 ? (
          <div className="space-y-3">
            {inWindow.map(({ action, primary, others }) => {
              const urgent = primary.daysUntil <= 3;
              return (
                <div key={action.id} className={`rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow border ${urgent ? 'bg-amber-50 border-amber-300' : 'bg-white border-neutral-100'}`} onClick={() => navigate(`/event/${action.id}`)}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: action.avatarColor }}>
                      <span className="text-white text-xs font-bold">{action.ticker}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-neutral-800">{action.security}</p>
                          <p className="text-xs text-neutral-500">{action.eventType} · {action.market}</p>
                        </div>
                        <StatusTag status={action.status} source={action.source} size="sm" />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${urgent ? 'bg-amber-200 text-amber-800' : 'bg-neutral-100 text-neutral-600'}`}>{primary.dateLabel}</span>
                        <span className="text-sm font-medium text-neutral-700">{fmtDate(primary.dateStr)}</span>
                        <span className={`text-xs font-semibold ${urgent ? 'text-amber-700' : 'text-neutral-500'}`}>{countdown(primary.daysUntil)}</span>
                      </div>
                      {others.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {others.map((o) => (
                            <p key={o.dateLabel} className="text-xs text-neutral-400">{o.dateLabel}: {fmtDate(o.dateStr)} ({countdown(o.daysUntil)})</p>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-neutral-500 mt-1.5">{hint(action, reviewedIds)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : futureFallback.length > 0 ? (
          <>
            <div className="bg-neutral-50 rounded-lg p-4 text-center mb-4">
              <Calendar size={20} className="mx-auto text-neutral-400 mb-1" />
              <p className="text-sm text-neutral-600">No key dates in the next 14 days.</p>
              <p className="text-xs text-neutral-500 mt-1">Here are the 3 nearest upcoming dates:</p>
            </div>
            <div className="space-y-3">
              {futureFallback.map((item) => (
                <div key={`${item.action.id}-${item.dateLabel}`} className="bg-white rounded-lg border border-neutral-100 p-4 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate(`/event/${item.action.id}`)}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.action.avatarColor }}>
                      <span className="text-white text-xs font-bold">{item.action.ticker}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-800">{item.action.security}</p>
                      <p className="text-xs text-neutral-500">{item.action.eventType} · {item.action.market}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">{item.dateLabel}</span>
                        <span className="text-sm text-neutral-700">{fmtDate(item.dateStr)}</span>
                        <span className="text-xs text-neutral-500">{countdown(item.daysUntil)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-neutral-50 rounded-lg p-8 text-center">
            <CheckCircle size={24} className="mx-auto text-success mb-2" />
            <p className="text-sm text-neutral-600">All key dates are in the past.</p>
            <p className="text-xs text-neutral-500 mt-1">No upcoming alerts to show.</p>
          </div>
        )}
      </main>
      <TabBar alertsCount={alertsCount} />
    </div>
  );
}