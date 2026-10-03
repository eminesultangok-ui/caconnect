/**
 * TextField — Reusable controlled text input with label, error display,
 * optional character counter, and helper text.
 *
 * Used on: LoginPage, ProfileSetupPage, ReviewPage
 * Implements "touched on blur" pattern: errors only show after first blur.
 * When maxLength is set, a live counter appears below the field and turns
 * amber when fewer than 20 characters remain.
 */

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  touched?: boolean;
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  maxLength?: number;
}

export default function TextField({
  label,
  value,
  onChange,
  onBlur,
  error,
  touched = false,
  type = 'text',
  placeholder,
  helperText,
  disabled = false,
  required = false,
  id,
  maxLength,
}: TextFieldProps) {
  // Only show error if field has been touched (blurred at least once)
  const showError = touched && error;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className={`
          w-full px-3 py-2 rounded-md border text-sm
          focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue
          disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed
          ${showError
            ? 'border-danger focus:ring-danger focus:border-danger'
            : 'border-neutral-300'
          }
        `}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {helperText && !showError && (
            <p className="text-xs text-neutral-500 mt-1">{helperText}</p>
          )}
          {showError && (
            <p className="text-xs text-danger mt-1">{error}</p>
          )}
        </div>
        {maxLength != null && (
          <p className={`text-xs mt-1 whitespace-nowrap ${value.length > maxLength - 20 ? 'text-amber-600' : 'text-neutral-400'}`}>
            {value.length} / {maxLength}
          </p>
        )}
      </div>
    </div>
  );
}