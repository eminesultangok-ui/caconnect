/**
 * WaveHeader — Brand signature wave graphic with CAConnect wordmark.
 * Full variant: h-32, larger wordmark, optional subtitle.
 * Compact variant: h-16, smaller wordmark, no subtitle.
 * Used on ALL 8 pages.
 */

import { useState } from 'react';

interface WaveHeaderProps {
  variant?: 'full' | 'compact';
  subtitle?: string;
  onSignOut?: () => void;
  onEditProfile?: () => void;
}

export default function WaveHeader({ variant = 'full', subtitle, onSignOut, onEditProfile }: WaveHeaderProps) {
  const isFull = variant === 'full';
  const height = isFull ? 'h-32' : 'h-16';
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  return (
    <>
    <div className={`relative ${height} bg-brand-light`}>
      <div className="absolute inset-0 overflow-hidden">
        <svg
          className="w-full h-full"
          viewBox={isFull ? '0 0 420 128' : '0 0 420 64'}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {isFull ? (
            <>
              <path d="M0,80 C100,40 200,100 420,60" stroke="#2563EB" strokeWidth="2" opacity="0.15" fill="none" />
              <path d="M0,90 C120,50 220,110 420,70" stroke="#2563EB" strokeWidth="1.5" opacity="0.10" fill="none" />
              <path d="M0,70 C80,30 180,90 420,50" stroke="#2563EB" strokeWidth="2.5" opacity="0.08" fill="none" />
              <path d="M0,100 C140,60 260,120 420,80" stroke="#2563EB" strokeWidth="1" opacity="0.12" fill="none" />
              <path d="M0,60 C60,20 160,80 420,40" stroke="#2563EB" strokeWidth="3" opacity="0.05" fill="none" />
              <path d="M0,110 C160,70 300,130 420,90" stroke="#2563EB" strokeWidth="1.5" opacity="0.07" fill="none" />
            </>
          ) : (
            <>
              <path d="M0,30 C80,10 200,50 420,25" stroke="#2563EB" strokeWidth="1.5" opacity="0.12" fill="none" />
              <path d="M0,40 C100,20 250,55 420,35" stroke="#2563EB" strokeWidth="1" opacity="0.08" fill="none" />
              <path d="M0,20 C60,5 180,40 420,15" stroke="#2563EB" strokeWidth="2" opacity="0.06" fill="none" />
            </>
          )}
        </svg>
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        {onSignOut && (
          <div className="absolute top-2 right-4 flex items-center gap-3 z-20">
            {onEditProfile && (
              <button
                type="button"
                onClick={onEditProfile}
                className="text-xs text-brand-blue underline hover:opacity-70"
              >
                Edit profile
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmingSignOut(true)}
              className="text-xs text-brand-blue underline hover:opacity-70"
            >
              Sign out
            </button>
          </div>
        )}
        <h1 className={`font-bold text-brand-blue ${isFull ? 'text-2xl' : 'text-lg'}`}>
          CAConnect
        </h1>
        {isFull && subtitle && (
          <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
    {onSignOut && confirmingSignOut && (
      <div className="bg-white border border-neutral-200 rounded-b-lg px-4 py-3 -mt-1 shadow-sm max-w-md mx-auto">
        <p className="text-sm text-neutral-700 mb-2">
          Sign out of CAConnect? Your completed reviews are kept.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => setConfirmingSignOut(false)}
            className="px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-800 rounded-full hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="px-3 py-1.5 text-sm text-white bg-brand-blue rounded-full hover:opacity-90"
          >
            Sign out
          </button>
        </div>
      </div>
    )}
    </>
  );
}