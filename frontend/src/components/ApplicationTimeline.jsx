export function ApplicationTimeline({ timeline = [], currentStatus = 'SUBMITTED' }) {
  return (
    <div className="flow-root" data-testid="application-timeline">
      <ul className="-mb-8">
        {timeline.map((event, eventIdx) => {
          const isLast = eventIdx === timeline.length - 1;
          const isCompleted = event.status === 'COMPLETED';
          const isCurrent = event.status === 'CURRENT' || event.stage === currentStatus;

          return (
            <li key={event.stage || eventIdx}>
              <div className="relative pb-8">
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className={`absolute top-4 left-4 -ml-px h-full w-0.5 ${
                      isCompleted ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  />
                ) : null}

                <div className="relative flex items-start space-x-3.5">
                  <div>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white ${
                        isCompleted
                          ? 'bg-indigo-600 text-white'
                          : isCurrent
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isCompleted ? '✓' : isCurrent ? '⏳' : '○'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <p
                        className={`font-bold ${
                          isCurrent
                            ? 'text-amber-900 text-sm'
                            : isCompleted
                            ? 'text-slate-900'
                            : 'text-slate-400'
                        }`}
                      >
                        {event.title}
                      </p>
                      {event.timestamp ? (
                        <time className="text-slate-400">
                          {new Date(event.timestamp).toLocaleDateString()}
                        </time>
                      ) : null}
                    </div>

                    {event.description ? (
                      <p
                        className={`mt-1 text-xs ${
                          isCurrent ? 'text-amber-800 font-medium' : 'text-slate-600'
                        }`}
                      >
                        {event.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

