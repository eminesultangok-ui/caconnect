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
import * as api from '../lib/api';
import { MIN_PASSWORD_LENGTH } from '../lib/constants';

const BRANCHES = ['Melbourne', 'Sydney', 'Singapore', 'London'];
const MARKETS = ['Australia', 'Japan', 'South Korea', 'Hong Kong', 'Germany', 'France', 'Switzerland', 'United Kingdom', 'United States'];

interface ProfileSetupPageProps {
  profile: AdvisorProfile | null;
  onComplete: (profile: AdvisorProfile) => void;
  isEditing?: boolean;
  onCancel?: () => void;
  onSignOut?: () => void;
}

export default function ProfileSetupPage({ profile, onComplete, isEditing = false, onCancel, onSignOut }: ProfileSetupPageProps) {
  const [name, setName] = useState(profile?.name ?? '');
  const [branch, setBranch] = useState(profile?.branch ?? '');
  const [markets, setMarkets] = useState<string[]>(profile?.markets ?? []);
  const [notificationPref, setNotificationPref] = useState<AdvisorProfile['notificationPref']>(profile?.notificationPref ?? 'email');
  const [touched, setTouched] = useState({ name: false, branch: false });
  const [isSaving, setIsSaving] = useState(false);

  // ─── Change password state ────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwTouched, setPwTouched] = useState({ current: false, new: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handleBlur = useCallback((field: 'name' | 'branch') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handlePwBlur = useCallback((field: 'current' | 'new' | 'confirm') => {
    setPwTouched((prev) => ({ ...prev, [field]: true }));
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

  // Change password validation
  const currentPwError = pwTouched.current && !currentPassword ? 'Current password is required' : '';
  const newPwError = pwTouched.new && !newPassword
    ? 'New password is required'
    : pwTouched.new && newPassword.length < MIN_PASSWORD_LENGTH
      ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      : '';
  const confirmPwError = pwTouched.confirm && !confirmPassword
    ? 'Please confirm your new password'
    : pwTouched.confirm && confirmPassword !== newPassword
      ? 'Passwords do not match'
      : '';
  const isPwValid = currentPassword.length > 0 && newPassword.length >= MIN_PASSWORD_LENGTH && confirmPassword === newPassword;

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSaving) return;
    setIsSaving(true);
    onComplete({ name: name.trim(), branch, markets, notificationPref });
  }, [name, branch, markets, notificationPref, isValid, isSaving, onComplete]);

  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPwValid || pwSaving) return;
    setPwSaving(true);
    setPwError('');
    setPwSuccess('');
    try {
      await api.changePassword(currentPassword, newPassword);
      setPwSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwTouched({ current: false, new: false, confirm: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      setPwError(msg);
    } finally {
      setPwSaving(false);
    }
  }, [currentPassword, newPassword, isPwValid, pwSaving]);

  return (
    <div className="min-h-screen bg-white">
      <WaveHeader variant="compact" onSignOut={onSignOut} />

      <main className="page-container">
        <StepIndicator current={1} />

        <h2 className="text-xl font-bold text-brand-blue mb-5">{isEditing ? 'Edit Profile' : 'Set Up Your Profile'}</h2>

        {isEditing && profile?.email && (
          <p className="text-sm text-neutral-500 mb-4">Signed in as <span className="font-medium text-neutral-700">{profile.email}</span></p>
        )}

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
            label={isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Continue to Dashboard'}
            type="submit"
            disabled={!isValid || isSaving}
            className="w-full"
          />
          {isEditing && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full mt-2 py-2.5 px-4 rounded-full text-sm font-semibold text-brand-blue hover:bg-brand-blue/5 transition-colors"
            >
              Cancel
            </button>
          )}
        </form>

        {/* ─── Change Password (edit mode only) ──── */}
        {isEditing && (
          <form onSubmit={handleChangePassword} className="mt-8">
            <FormSection title="Change Password" description="Update your password. Must be at least 8 characters.">
              <TextField
                label="Current password"
                value={currentPassword}
                onChange={(val) => { setCurrentPassword(val); setPwError(''); setPwSuccess(''); }}
                onBlur={() => handlePwBlur('current')}
                error={currentPwError}
                touched={pwTouched.current}
                type="password"
                placeholder="Enter your current password"
                required
                id="pw-current"
              />
              <TextField
                label="New password"
                value={newPassword}
                onChange={(val) => { setNewPassword(val); setPwError(''); setPwSuccess(''); }}
                onBlur={() => handlePwBlur('new')}
                error={newPwError}
                touched={pwTouched.new}
                type="password"
                placeholder="At least 8 characters"
                required
                id="pw-new"
              />
              <TextField
                label="Confirm new password"
                value={confirmPassword}
                onChange={(val) => { setConfirmPassword(val); setPwError(''); setPwSuccess(''); }}
                onBlur={() => handlePwBlur('confirm')}
                error={confirmPwError}
                touched={pwTouched.confirm}
                type="password"
                placeholder="Re-enter your new password"
                required
                id="pw-confirm"
              />
              {pwError && (
                <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div role="status" className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                  {pwSuccess}
                </div>
              )}
              <button
                type="submit"
                disabled={!isPwValid || pwSaving}
                className={`w-full py-2.5 px-4 rounded-full text-sm font-semibold transition-colors duration-200 ${isPwValid && !pwSaving ? 'bg-ink text-white hover:bg-ink/90' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
              >
                {pwSaving ? 'Updating…' : 'Update password'}
              </button>
            </FormSection>
          </form>
        )}
      </main>
    </div>
  );
}