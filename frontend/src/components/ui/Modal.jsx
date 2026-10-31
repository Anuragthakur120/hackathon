import { useEffect, useId } from 'react';
import { IconButton } from './IconButton.jsx';

const TONE_HEADER_BAR = {
  default: 'bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500',
  consent: 'bg-violet-600',
  approval: 'bg-gradient-to-r from-rose-600 to-emerald-600',
  danger: 'bg-red-600',
};

/**
 * Accessible Govtech Modal dialog with Escape key close, backdrop dismiss,
 * and Gate/Phase accent header bar.
 */
export function Modal({
  open = false,
  title,
  children,
  footer,
  tone = 'default',
  onClose,
  closeLabel = 'Close dialog',
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && typeof onClose === 'function') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const headerBar = TONE_HEADER_BAR[tone] || TONE_HEADER_BAR.default;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in motion-reduce:animate-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && typeof onClose === 'function') {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        <div className={`h-2 w-full ${headerBar}`} aria-hidden="true" />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            {title && (
              <h2
                id={titleId}
                className="text-xl font-extrabold text-slate-900 leading-snug"
              >
                {title}
              </h2>
            )}
            {typeof onClose === 'function' && (
              <IconButton
                icon="✕"
                ariaLabel={closeLabel}
                variant="ghost"
                onClick={onClose}
              />
            )}
          </div>
          <div className="text-base text-slate-700 leading-relaxed">
            {children}
          </div>
          {footer && (
            <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;

