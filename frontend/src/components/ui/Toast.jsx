import { IconButton } from './IconButton.jsx';

const TOAST_STYLES = {
  info: 'bg-indigo-50 border-indigo-300 text-indigo-950',
  success: 'bg-green-50 border-green-300 text-green-950',
  warning: 'bg-amber-50 border-amber-300 text-amber-950',
  danger: 'bg-red-50 border-red-300 text-red-950',
};

/**
 * Accessible Toast notification component with polite/assertive live region.
 */
export function Toast({
  title,
  message,
  variant = 'info',
  onDismiss,
  dismissLabel = 'Dismiss notification',
  className = '',
}) {
  const style = TOAST_STYLES[variant] || TOAST_STYLES.info;

  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      aria-live={variant === 'danger' ? 'assertive' : 'polite'}
      className={[
        'flex items-center justify-between gap-4 p-4 rounded-2xl border-2 shadow-sm',
        'transition-all duration-200 motion-reduce:transition-none',
        style,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div>
        {title && <p className="font-extrabold text-base leading-snug">{title}</p>}
        {message && (
          <p className="text-base mt-0.5 leading-relaxed">{message}</p>
        )}
      </div>
      {typeof onDismiss === 'function' && (
        <IconButton
          icon="✕"
          ariaLabel={dismissLabel}
          variant="ghost"
          onClick={onDismiss}
        />
      )}
    </div>
  );
}

export default Toast;
