export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs = [],
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <span className="text-slate-400">/</span>}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-indigo-600 font-medium">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-slate-800 font-semibold">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}

        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h1>
          {badge ? (
            <span className="rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              {badge}
            </span>
          ) : null}
        </div>

        {subtitle ? (
          <p className="mt-1 text-sm text-slate-600 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

