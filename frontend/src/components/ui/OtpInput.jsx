import { useRef } from 'react';

/**
 * 6-box accessible OTP Input component (min 56px height per box).
 * Supports digit entry auto-advance, Backspace navigation, Left/Right arrows, and paste.
 */
export function OtpInput({
  value = '',
  length = 6,
  onChange,
  label = '6-Digit OTP',
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
    if (!cleaned) {
      const next = [...digits];
      next[idx] = '';
      emitOtp(next);
      return;
    }

    // Handle multi-digit paste/autofill
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

    const next = [...digits];
    next[idx] = cleaned[0];
    emitOtp(next);

    if (idx < length - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (disabled) return;
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
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

  return (
    <fieldset className="w-full" disabled={disabled}>
      {label && (
        <legend className="text-base font-bold text-slate-900 mb-2">
          {label}
        </legend>
      )}
      <div
        className="flex flex-wrap items-center gap-2.5"
        onPaste={handlePaste}
      >
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            disabled={disabled}
            aria-label={`OTP digit ${idx + 1} of ${length}`}
            aria-invalid={Boolean(error) || undefined}
            onChange={(e) => handleDigitChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            className={[
              'w-12 sm:w-14 min-h-[56px] text-center text-xl font-extrabold rounded-xl bg-white text-slate-900',
              'border-2 transition-all duration-150 motion-reduce:transition-none',
              'focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30',
              error
                ? 'border-red-600'
                : 'border-slate-300 focus:border-indigo-600',
              'disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed',
            ].join(' ')}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export default OtpInput;

