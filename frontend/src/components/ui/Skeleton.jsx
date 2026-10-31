/**
 * Accessible Skeleton loader respecting prefers-reduced-motion.
 */
export function Skeleton({
  lines = 3,
  label = 'Loading content...',
  className = '',
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={`w-full space-y-3 p-4 rounded-2xl bg-white border border-slate-200 ${className}`}
    >
      <div className="h-5 w-1/3 bg-slate-200 rounded-lg animate-pulse motion-reduce:animate-none" />
      {Array.from({ length: Math.max(1, lines - 1) }).map((_, idx) => (
        <div
          key={idx}
          className={[
            'h-4 bg-slate-200 rounded-lg animate-pulse motion-reduce:animate-none',
            idx % 2 === 0 ? 'w-full' : 'w-4/5',
          ].join(' ')}
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default Skeleton;
