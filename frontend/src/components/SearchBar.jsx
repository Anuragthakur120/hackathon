export function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search by scheme name, department or keyword...',
  className = '',
  testId = 'search-bar-input',
}) {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <span className="absolute left-3.5 text-slate-400 text-base pointer-events-none" aria-hidden="true">
        🔍
      </span>
      <input
        type="text"
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear || (() => onChange(''))}
          aria-label="Clear search"
          className="absolute right-3 rounded-md p-1 text-xs font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

