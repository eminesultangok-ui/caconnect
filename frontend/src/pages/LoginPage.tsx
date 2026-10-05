/**
 * LoginPage — Email + password login with Supabase Auth.
 * Supports both Sign Up and Log In modes via a toggle.
 * Props: onLogin callback, initialLoading flag
 * Uses: TextField, IconButton, WaveHeader components
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '../components/ui/TextField';
import IconButton from '../components/ui/IconButton';
import WaveHeader from '../components/ui/WaveHeader';
import { MIN_PASSWORD_LENGTH } from '../lib/constants';

interface LoginPageProps {
  onLogin: (email: string, password: string, isSignUp: boolean) => Promise<boolean>;
  initialLoading?: boolean;
}

export default function LoginPage({ onLogin, initialLoading }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loginError, setLoginError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleBlur = useCallback((field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleEmailChange = useCallback((val: string) => {
    setEmail(val);
    setLoginError('');
  }, []);

  const handlePasswordChange = useCallback((val: string) => {
    setPassword(val);
    setLoginError('');
  }, []);

  const emailFormatOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const emailError = touched.email && !email.trim()
    ? 'Email is required'
    : touched.email && email.trim() && !emailFormatOk
      ? 'Enter a valid email address'
      : '';
  const pwMin = isSignUp ? MIN_PASSWORD_LENGTH : 6;
  const passwordError = touched.password && !password
    ? 'Password is required'
    : touched.password && password.length < pwMin
      ? `Password must be at least ${pwMin} characters`
      : '';
  const isValid = email.trim().length > 0 && emailFormatOk && password.length >= pwMin;

  // Real auth via Supabase (proxied through backend)
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setLoginError('');
    try {
      const hasProfile = await onLogin(email.trim(), password, isSignUp);
      if (hasProfile) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/setup', { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setLoginError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [email, password, isValid, submitting, isSignUp, onLogin, navigate]);

  // Show a full-screen spinner while checking token on mount
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

  return (
    <div className="min-h-screen bg-white">
      <WaveHeader variant="full" subtitle="Corporate Actions Self-Service Portal" />

      <main className="px-4 py-6">
        {/* Sign Up / Log In toggle */}
        <div className="flex bg-neutral-100 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setLoginError(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              !isSignUp ? 'bg-white text-brand-blue shadow-sm' : 'text-neutral-500'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setLoginError(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              isSignUp ? 'bg-white text-brand-blue shadow-sm' : 'text-neutral-500'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Login / Sign-up form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-neutral-100 p-5">
          <h2 className="text-lg font-semibold text-brand-blue mb-4">
            {isSignUp ? 'Create an Account' : 'Sign In'}
          </h2>

          <div className="space-y-4">
            <TextField
              label="Email address"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => handleBlur('email')}
              error={emailError}
              touched={touched.email}
              type="email"
              placeholder="you@example.com"
              required
              id="login-email"
            />
            <TextField
              label="Password"
              value={password}
              onChange={handlePasswordChange}
              onBlur={() => handleBlur('password')}
              error={passwordError}
              touched={touched.password}
              type="password"
              placeholder="Enter your password"
              helperText={isSignUp ? `Minimum ${MIN_PASSWORD_LENGTH} characters` : undefined}
              required
              id="login-password"
            />
          </div>

          {loginError && (
            <div role="alert" className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {loginError}
            </div>
          )}

          <IconButton
            label={submitting ? 'Please wait…' : isSignUp ? 'Sign Up' : 'Sign In'}
            type="submit"
            disabled={!isValid || submitting}
            className="w-full mt-6"
          />
        </form>
      </main>
    </div>
  );
}