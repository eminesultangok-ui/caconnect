/**
 * DashboardPage — Active corporate actions with search, filter pills, stat chips, and metrics strip.
 * Props: actions, reviews, profile, stats (all from App.tsx)
 * Uses: StatusTag, WaveHeader, TabBar components
 */

import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { CorporateAction, ReviewEntry, AdvisorProfile, AdoptionStats } from '../types';
import StatusTag from '../components/ui/StatusTag';
import WaveHeader from '../components/ui/WaveHeader';
import TabBar from '../components/ui/TabBar';
import { crossBranchText } from '../utils/crossBranch';

interface DashboardPageProps {
  actions: CorporateAction[];
  reviews: ReviewEntry[];
  profile: AdvisorProfile | null;
  stats: AdoptionStats;
  onSignOut?: () => void;
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Custodian-confirmed', label: 'Confirmed' },
  { value: 'Preliminary', label: 'Preliminary' },
  { value: 'Pending', label: 'Pending' },
];

export default function DashboardPage({ actions, reviews, profile, stats, onSignOut }: DashboardPageProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return actions.filter((a) => {
      const matchSearch = search === '' ||
        a.security.toLowerCase().includes(search.toLowerCase()) ||
        a.ticker.toLowerCase().includes(search.toLowerCase()) ||
        a.id.toLowerCase().includes(search.toLowerCase()) ||
        a.eventType.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || a.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [actions, search, filterStatus]);

  // Stat chip counts
  const activeCount = actions.length;
  const confirmedCount = actions.filter((a) => a.status === 'Custodian-confirmed').length;
  const preliminaryCount = actions.filter((a) => a.status === 'Preliminary').length;
  const pendingCount = actions.filter((a) => a.status === 'Pending').length;

  return (
    <div className="min-h-screen bg-white pb-16">
      <WaveHeader variant="full" subtitle="Corporate Actions Self Service" onSignOut={onSignOut} />

      <main className="px-4 py-5">
        <h2 className="text-xl font-bold text-brand-blue mb-4">Dashboard</h2>

        {/* Stat chips */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <div className="bg-neutral-50 rounded-lg p-2.5 text-center">
            <p className="text-xs text-neutral-500">Active</p>
            <p className="text-lg font-bold text-neutral-800">{activeCount}</p>
          </div>
          <div className="bg-success-light rounded-lg p-2.5 text-center">
            <p className="text-xs text-success">Confirmed</p>
            <p className="text-lg font-bold text-success">{confirmedCount}</p>
          </div>
          <div className="bg-warning-light rounded-lg p-2.5 text-center">
            <p className="text-xs text-warning">Preliminary</p>
            <p className="text-lg font-bold text-warning">{preliminaryCount}</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-2.5 text-center">
            <p className="text-xs text-indigo-600">New</p>
            <p className="text-lg font-bold text-indigo-600">{pendingCount}</p>
          </div>
        </div>

        {/* Metrics strip */}
        <div className="bg-brand-light rounded-lg p-3 mb-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-brand-blue">{stats.reviewedEvents} of {stats.totalEvents} reviewed</span>
            <span className="text-neutral-300">·</span>
            <span className={stats.selfServiceRate >= 70 ? 'text-success font-semibold' : 'font-semibold'}>{stats.selfServiceRate}% self-service</span>
            <span className="text-neutral-300">·</span>
            <span className="text-neutral-500">target 70%</span>
          </div>
        </div>

        {/* Search field */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <input ref={searchRef} type="text" placeholder="Search by security, ticker, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-full border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-5 overflow-x-auto">
          {FILTER_OPTIONS.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setFilterStatus(opt.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterStatus === opt.value ? 'bg-brand-blue text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>{opt.label}</button>
          ))}
        </div>

        {/* Event Cards */}
        <h3 className="text-sm font-semibold text-neutral-800 mb-3">Active Corporate Actions</h3>
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-neutral-50 rounded-lg p-6 text-center"><p className="text-neutral-500 text-sm">No events match your search.</p></div>
          ) : filtered.map((action) => {
            const reviewed = reviews.filter((r) => r.eventId === action.id);
            return (
              <div key={action.id} className="bg-white rounded-lg border border-neutral-100 p-4 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate(`/event/${action.id}`)}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: action.avatarColor }}><span className="text-white text-xs font-bold">{action.ticker}</span></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div><h4 className="text-sm font-semibold text-neutral-800">{action.security}</h4><p className="text-xs text-neutral-500">{action.eventType} · {action.source}</p></div>
                      <StatusTag status={action.status} source={action.source} size="sm" />
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">Ex: {action.exDate} · Payment: {action.paymentDate}</p>
                    {reviewed.length > 0 && <p className="text-xs text-success mt-1 font-medium">✓ {reviewed.length} review{reviewed.length > 1 ? 's' : ''}</p>}
                    {crossBranchText(action.reviewedByBranches, profile?.branch) && <p className="text-xs text-neutral-400 mt-1">{crossBranchText(action.reviewedByBranches, profile?.branch)}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <TabBar onSearch={() => searchRef.current?.focus()} />
    </div>
  );
}