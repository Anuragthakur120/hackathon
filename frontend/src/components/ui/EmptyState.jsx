import { Button } from './Button.jsx';

/**
 * Calm Govtech EmptyState component with icon, title, description, and optional primary action.
 */
export function EmptyState({
  icon = '📋',
  title = 'No items found',
  description = '',
  actionLabel = '',
  onAction,
  className = '',
}) {
  return (
    <div
      className={[
        'bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="text-4xl mb-3" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-xl font-extrabold text-slate-900 leading-snug">
        {title}
      </h3>
      {description && (
        <p className="text-base text-slate-600 mt-1.5 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && typeof onAction === 'function' && (
        <div className="mt-5">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default EmptyState;

