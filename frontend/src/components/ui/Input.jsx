import { useId } from 'react';

/**
 * Accessible Govtech Input component with label, helper text, error state,
 * visible focus ring, and >= 56px touch target.
 */
export function Input({
  id,
  label,
  helper,
  error,
  disabled = false,
  required = false,
  className = '',
  ...rest
}) {
  const autoId = useId();
  const inputId = id || `ns-input-${autoId}`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-base font-bold text-slate-900 mb-1.5 leading-snug"
        >
          {label}
          {required && (
            <span className="text-red-600 ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <input
        id={inputId}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={
          error ? errorId : helper ? helperId : undefined
        }
        className={[
          'w-full min-h-[56px] px-4 py-3 rounded-xl bg-white text-slate-900 text-base font-medium',
          'border-2 transition-all duration-150 motion-reduce:transition-none',
          'placeholder:text-slate-400',
          'focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-1',
          error
            ? 'border-red-600 focus-visible:ring-red-500/30'
            : 'border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus-visible:ring-indigo-500/30',
          'disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed',
        ].join(' ')}
        {...rest}
      />
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-sm font-bold text-red-700 leading-snug"
        >
          {error}
        </p>
      )}
      {!error && helper && (
        <p id={helperId} className="mt-1.5 text-sm text-slate-600 leading-snug">
          {helper}
        </p>
      )}
    </div>
  );
}

export default Input;
