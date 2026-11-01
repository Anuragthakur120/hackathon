import { Link } from 'react-router-dom';

const NOTIF_ICONS = {
  DOCUMENT_ALERT: '⚠️',
  STATUS_UPDATE: '🔄',
  APPROVAL: '✅',
  REJECTION: '❌',
  DEADLINE: '⏰',
  ANNOUNCEMENT: '📢',
};

export function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
}) {
  const icon = NOTIF_ICONS[notification.type] || '🔔';

  return (
    <div
      data-testid={`notif-card-${notification.notificationId}`}
      className={`flex items-start justify-between gap-4 rounded-2xl border p-4 transition-all duration-200 ${
        !notification.read
          ? 'border-indigo-200 bg-indigo-50/40 shadow-xs'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-lg shadow-2xs">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4
              className={`text-sm ${
                !notification.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
              }`}
            >
              {notification.title}
            </h4>
            {!notification.read ? (
              <span className="flex h-2 w-2 rounded-full bg-indigo-600" />
            ) : null}
          </div>

          <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-2xl">
            {notification.message}
          </p>

          <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 font-medium">
            <time>{new Date(notification.createdAt).toLocaleDateString()}</time>
            {notification.link ? (
              <Link
                to={notification.link}
                className="font-bold text-indigo-600 hover:text-indigo-800 underline"
              >
                View Details →
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {!notification.read && onMarkRead ? (
          <button
            type="button"
            onClick={() => onMarkRead(notification.notificationId)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            Mark Read
          </button>
        ) : null}

        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(notification.notificationId)}
            aria-label="Delete Notification"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
          >
            🗑️
          </button>
        ) : null}
      </div>
    </div>
  );
}

