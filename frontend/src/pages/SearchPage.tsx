/**
 * SearchPage — Filter events by issuer, security, ticker or ISIN as the user types.
 * Each result links to /event/:id.
 * Uses: WaveHeader, TabBar, StatusTag, TextField
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CorporateAction } from '../types';
import StatusTag from '../components/ui/StatusTag';
import WaveHeader from '../components/ui/WaveHeader';
import TabBar from '../components/ui/TabBar';
import TextField from '../components/ui/TextField';
import { isMandatoryEvent } from '../lib/constants';

interface SearchPageProps {
  actions: CorporateAction[];
  alertsCount?: number;
  onEditProfile?: () => void;
  onSignOut?: () => void;
}

export default function SearchPage({ actions, alertsCount = 0, onEditProfile, onSignOut }: SearchPageProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return actions.filter((a) =>
      a.issuer.toLowerCase().includes(q) ||
      a.security.toLowerCase().includes(q) ||
      a.ticker.toLowerCase().includes(q) ||
      a.isin.toLowerCase().includes(q) ||
      a.eventType.toLowerCase().includes(q) ||
      a.market.toLowerCase().includes(q)
    );
  }, [actions, query]);

  return (
    <div className="min-h-screen bg-white pb-16">
      <WaveHeader variant="compact" onSignOut={onSignOut} onEditProfile={onEditProfile} />
      <main className="px-4 py-5">
        <h2 className="text-xl font-bold text-brand-blue mb-4">Search</h2>
        <div className="mb-5">
          <TextField
            label="Search events"
            value={query}
            onChange={setQuery}
            placeholder="Issuer, security, ticker, ISIN, event type, or market…"
            id="search-input"
          />
        </div>
        {query.trim() && results.length === 0 && (
          <div className="bg-neutral-50 rounded-lg p-6 text-center">
            <p className="text-neutral-500 text-sm">No events match "{query}".</p>
          </div>
        )}
        {!query.trim() && (
          <div className="bg-neutral-50 rounded-lg p-6 text-center">
            <p className="text-neutral-400 text-sm">Start typing to search across all corporate actions.</p>
          </div>
        )}
        <div className="space-y-3">
          {results.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-lg border border-neutral-100 p-4 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => navigate(`/event/${a.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: a.avatarColor }}>
                  <span className="text-white text-xs font-bold">{a.ticker}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div><h4 className="text-sm font-semibold text-neutral-800">{a.security}</h4><p className="text-xs text-neutral-500">{a.eventType} · {a.market}</p>
                      <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold leading-none border ${isMandatoryEvent(a.eventType) ? 'bg-neutral-100 text-neutral-600 border-neutral-200' : 'bg-brand-blue text-white border-brand-blue'}`} title={isMandatoryEvent(a.eventType) ? 'Happens automatically \u2014 no client instruction needed.' : 'The client must choose an option before the deadline.'}>{isMandatoryEvent(a.eventType) ? 'Mandatory' : 'Voluntary'}</span></div>
                    </div>
                    <StatusTag status={a.status} source={a.source} size="sm" />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">ISIN: {a.isin}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <TabBar alertsCount={alertsCount} />
    </div>
  );
}