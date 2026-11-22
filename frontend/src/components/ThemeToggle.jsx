import { useApp } from '../state/AppContext.jsx';

export function ThemeToggle({ variant = 'icon', className = '', testId = 'theme-toggle-btn' }) {
  const { theme, resolvedTheme, setTheme } = useApp();

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  if (variant === 'segmented') {
    return (
      <div
        role="group"
        aria-label="Theme selection"
        data-testid={`${testId}-segmented`}
        className={`inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 ${className}`.trim()}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          aria-pressed={theme === 'light'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            theme === 'light'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span aria-hidden="true">☀️</span>
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          aria-pressed={theme === 'dark'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            theme === 'dark'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span aria-hidden="true">🌙</span>
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          aria-pressed={theme === 'system'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            theme === 'system'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span aria-hidden="true">💻</span>
          <span>Auto</span>
        </button>
      </div>
    );
  }

  const icon = resolvedTheme === 'dark' ? '🌙' : '☀️';
  const label =
    theme === 'system'
      ? `System Theme (${resolvedTheme}). Click to switch to Light.`
      : theme === 'dark'
      ? 'Dark Theme. Click to switch to System.'
      : 'Light Theme. Click to switch to Dark.';

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={cycleTheme}
      aria-label={label}
      title={label}
      className={`ns-btn min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 px-3 py-2 text-base font-bold text-slate-800 dark:text-slate-200 shadow-xs transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/70 dark:hover:bg-slate-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 active:scale-95 cursor-pointer ${className}`.trim()}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {icon}
      </span>
      {theme === 'system' && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 ml-1 hidden sm:inline">
          Auto
        </span>
      )}
    </button>
  );
}
