/**
 * ProfileSetupPage — Advisor profile setup: name, branch, markets, notification preference.
 * Props: profile (from App.tsx), onComplete callback
 * Uses: FormSection, TextField components
 */

import { useState, useCallback } from 'react';
import type { AdvisorProfile } from '../types';
import FormSection from '../components/ui/FormSection';
import TextField from '../components/ui/TextField';
import StepIndicator from '../components/ui/StepIndicator';
import IconButton from '../components/ui/IconButton';
import WaveHeader from '../components/ui/WaveHeader';

const BRANCHES = ['Melbourne', 'Sydney', 'Singapore', 'London'];
const MARKETS = ['Australia', 'Japan', 'South Korea', 'Hong Kong', 'Germany', 'France', 'Switzerland', 'United Kingdom'];

interface ProfileSetupPageProps {
  profile: AdvisorProfile | null;
  onComplete: (profile: AdvisorProfile) => void;
  onSignOut?: () => void;
}

export default function ProfileSetupPage({ profile, onComplete, onSignOut }: ProfileSetupPageProps) {
  const [name, setName] = useState(profile?.name ?? '');
  const [branch, setBranch] = useState(profile?.branch ?? '');
  const [markets, setMarkets] = useState<string[]>(profile?.markets ?? []);
  const [notificationPref, setNotificationPref] = useState<AdvisorProfile['notificationPref']>(profile?.notificationPref ?? 'email');
  const [touched, setTouched] = useState({ name: false, branch: false });

  const handleBlur = useCallback((field: 'name' | 'branch') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const toggleMarket = useCallback((market: string) => {
    setMarkets((prev) =>
      prev.includes(market) ? prev.filter((m) => m !== market) : [...prev, market]
    );
  }, []);

  // Bug2 fix: error strings gated on touched
  const nameError = touched.name && !name.trim() ? 'Name is required' : '';
  const branchError = touched.branch && !branch ? 'Please select a branch' : '';
  const isValid = name.trim().length > 0 && branch.length > 0;

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onComplete({ name: name.trim(), branch, markets, notificationPref });
  }, [name, branch, markets, notificationPref, isValid, onComplete]);

  return (
    <div className="min-h-screen bg-white">
      <WaveHeader variant="compact" onSignOut={onSignOut} />

      <main className="page-container">
        <StepIndicator current={1} />

        <h2 className="text-xl font-bold text-brand-blue mb-5">Set Up Your Profile</h2>

        <form onSubmit={handleSubmit}>
          <FormSection title="Your Details" description="Tell us about yourself so we can personalise your experience.">
            <TextField
              label="Full name"
              value={name}
              onChange={setName}
              onBlur={() => handleBlur('name')}
              error={nameError}
              touched={touched.name}
              placeholder="e.g. Sarah Chen"
              required
              id="profile-name"
            />
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Branch <span className="text-danger ml-0.5">*</span>
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                onBlur={() => handleBlur('branch')}
                className={`w-full px-3 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${touched.branch && branchError ? 'border-danger' : 'border-neutral-300'}`}
              >
                <option value="">Select your branch</option>
                {BRANCHES.map((b) => (<option key={b} value={b}>{b}</option>))}
              </select>
              {touched.branch && branchError && <p className="text-xs text-danger mt-1">{branchError}</p>}
            </div>
          </FormSection>

          <FormSection title="Markets Covered" description="Select the markets you monitor. This helps prioritise relevant events.">
            <div className="flex flex-wrap gap-2">
              {MARKETS.map((market) => (
                <button
                  key={market}
                  type="button"
                  onClick={() => toggleMarket(market)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${markets.includes(market) ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-neutral-600 border-neutral-300 hover:border-brand-blue'}`}
                >
                  {market}
                </button>
              ))}
            </div>
          </FormSection>

          <FormSection title="Notifications">
            <div className="space-y-2">
              {(['email', 'in-app', 'both'] as const).map((pref) => (
                <label key={pref} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="notification" value={pref} checked={notificationPref === pref} onChange={() => setNotificationPref(pref)} className="text-brand-blue focus:ring-brand-blue" />
                  <span className="text-sm text-neutral-700 capitalize">{pref === 'in-app' ? 'In-app notifications' : pref === 'both' ? 'Email + In-app' : 'Email only'}</span>
                </label>
              ))}
            </div>
          </FormSection>

          {/* PRIMARY ACTION BUTTON — IconButton */}
          <IconButton
            label="Continue to Dashboard"
            type="submit"
            disabled={!isValid}
            className="w-full"
          />
        </form>
      </main>
    </div>
  );
}