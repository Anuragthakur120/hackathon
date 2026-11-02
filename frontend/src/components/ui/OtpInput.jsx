import { useRef } from 'react';

/**
 * Premium 6-segmented accessible OTP Input component.
 * Features auto-advance, backspace navigation, arrow keys, paste support,
 * and smooth focus/filled micro-interactions. Fits perfectly on mobile (320px+).
 */
export function OtpInput({
  value = '',
  length = 6,
  onChange,
  label = '6-Digit Verification Code',
  error = '',
  disabled = false,
}) {
  const inputRefs = useRef([]);
  const digits = Array.from({ length }, (_, idx) => value[idx] || '');

  const emitOtp = (nextDigits) => {
    if (typeof onChange === 'function') {
      onChange(nextDigits.join(''));
    }
  };

  const handleDigitChange = (idx, rawVal) => {
    if (disabled) return;
    const cleaned = String(rawVal || '').replace(/\D/g, '');

    // User cleared the box
    if (!cleaned) {
      const next = [...digits];
      next[idx] = '';
      emitOtp(next);
      return;
    }

    // Handle paste or multi-digit autofill in a single box
    if (cleaned.length > 1) {
      const next = [...digits];
      for (let i = 0; i < cleaned.length && idx + i < length; i += 1) {
        next[idx + i] = cleaned[i];
      }
      emitOtp(next);
      const focusIdx = Math.min(idx + cleaned.length, length - 1);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    // Single digit entry
    const next = [...digits];
    next[idx] = cleaned[0];
    emitOtp(next);

    // Auto-advance to next box
    if (idx < length - 1) {
      inputRefs.current[idx + 1]?.focus();
      inputRefs.current[idx + 1]?.select();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      if (!digits[idx] && idx > 0) {
        // Current box is empty, jump back and clear previous
        const next = [...digits];
        next[idx - 1] = '';
        emitOtp(next);
        inputRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      e.preventDefault();
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    if (disabled) return;
    const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();

    const next = Array.from({ length }, (_, i) => pasted[i] || digits[i] || '');
    emitOtp(next);

    const focusIdx = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleFocus = (idx) => {
    inputRefs.current[idx]?.select();
  };

  return (
    <fieldset className="w-full" disabled={disabled}>
      {label ? (
        <legend className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 text-center sm:text-left">
          {label}
        </legend>
      ) : null}

      <div
        className="flex items-center justify-between gap-1.5 sm:gap-2.5 md:gap-3 w-full max-w-md mx-auto"
        onPaste={handlePaste}
      >
        {digits.map((digit, idx) => {
          const isFilled = Boolean(digit);
          return (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              disabled={disabled}
              aria-label={`OTP digit ${idx + 1} of ${length}`}
              aria-invalid={Boolean(error) || undefined}
              onFocus={() => handleFocus(idx)}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={[
                'w-10 sm:w-12 md:w-14 h-13 sm:h-15 md:h-16',
                'text-center text-xl sm:text-2xl md:text-3xl font-black rounded-2xl',
                'border-2 transition-all duration-150 shadow-xs',
                'focus:outline-none focus:scale-105 focus:shadow-md',
                error
                  ? 'border-rose-400 bg-rose-50/50 text-rose-950 focus:border-rose-600 focus:ring-4 focus:ring-rose-500/20'
                  : isFilled
                  ? 'border-indigo-400 bg-indigo-50/30 text-indigo-950 font-black focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/20'
                  : 'border-slate-200/90 bg-white text-slate-900 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/20',
                'disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200',
              ].join(' ')}
            />
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="mt-2.5 text-xs sm:text-sm font-bold text-rose-600 text-center sm:text-left">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export default OtpInput;

