/**
 * StepIndicator — "Step N of 4" progress indicator.
 * Purely presentational, no state, no side effects.
 * Used on: ProfileSetupPage (1), ReviewPage (2), ConfirmPage (3), ResultPage (4)
 *
 * Renders:
 *   - Line 1: "Step 2 of 4" in small bold navy text.
 *   - Line 2: Four labels in a row, separated by dividers.
 *     Past steps show ✓ in success green.
 *     Current step label is bold navy.
 *     Future steps are muted grey.
 */

interface StepIndicatorProps {
  current: 1 | 2 | 3 | 4;
}

const STEPS = ['Profile', 'Review', 'Confirm', 'Result'];

export default function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div className="mb-6 text-center">
      {/* Line 1: Step N of 4 */}
      <p className="text-xs font-semibold text-brand-blue mb-2">
        Step {current} of 4
      </p>

      {/* Line 2: Labels row */}
      <div className="flex items-center justify-center gap-0">
        {STEPS.map((label, i) => {
          const step = i + 1;
          const isActive = step === current;
          const isPast = step < current;

          return (
            <span key={step} className="flex items-center">
              {/* Divider between steps */}
              {i > 0 && (
                <span className="w-6 h-px bg-neutral-300 mx-1" aria-hidden="true" />
              )}

              {/* Label */}
              <span
                className={
                  isPast
                    ? 'text-success text-xs'
                    : isActive
                      ? 'text-brand-blue font-semibold text-xs'
                      : 'text-neutral-400 text-xs'
                }
              >
                {isPast ? `${label} ✓` : label}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}