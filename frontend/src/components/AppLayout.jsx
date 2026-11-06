import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useApp } from '../state/AppContext.jsx';
import { useAuthStore } from '../state/authStore.js';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { FloatingAssistant } from './FloatingAssistant.jsx';

export function AppLayout({ children }) {
  const { t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close menus on route change
  useEffect(() => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close user menu on outside click or Escape
  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Citizen Dashboard', icon: '🏛️', testId: 'nav-dashboard' },
    { id: 'schemes', path: '/schemes', label: 'All Schemes', icon: '📜', testId: 'nav-schemes' },
    { id: 'eligibility', path: '/eligibility', label: 'Eligibility Check', icon: '⚡', testId: 'nav-eligibility' },
    { id: 'cases', path: '/applications', label: t('navCases'), icon: '📁', testId: 'nav-cases' },
    { id: 'docs', path: '/documents', label: t('navDocs'), icon: '📄', testId: 'nav-docs' },
    { id: 'assistant', path: '/assistant', label: 'AI Voice Assistant', icon: '🎙️', testId: 'nav-assistant' },
    { id: 'notifications', path: '/notifications', label: 'Notifications', icon: '🔔', testId: 'nav-notifications' },
    { id: 'help', path: '/support', label: t('navHelp'), icon: '📞', testId: 'nav-help' },
    { id: 'home', path: '/app', label: '16-Step Journey', icon: '🧭', testId: 'nav-home' },
    { id: 'profile', path: '/profile', label: 'My Profile', icon: '👤', testId: 'nav-profile' },
  ];

  const mobileNavItems = [
    { id: 'home', path: '/app', label: t('navHome'), icon: '🏠', mobileTestId: 'mobile-tab-home' },
    { id: 'cases', path: '/applications', label: t('navCases'), icon: '📁', mobileTestId: 'mobile-tab-cases' },
    { id: 'docs', path: '/documents', label: t('navDocs'), icon: '📄', mobileTestId: 'mobile-tab-docs' },
    { id: 'help', path: '/support', label: t('navHelp'), icon: '📞', mobileTestId: 'mobile-tab-help' },
  ];

  const currentNav = location.pathname.startsWith('/dashboard')
    ? 'dashboard'
    : location.pathname.startsWith('/schemes')
    ? 'schemes'
    : location.pathname.startsWith('/eligibility')
    ? 'eligibility'
    : location.pathname.startsWith('/applications') || location.pathname.includes('/cases')
    ? 'cases'
    : location.pathname.startsWith('/documents')
    ? 'docs'
    : location.pathname.startsWith('/assistant')
    ? 'assistant'
    : location.pathname.startsWith('/notifications')
    ? 'notifications'
    : location.pathname.startsWith('/profile')
    ? 'profile'
    : location.pathname.startsWith('/support') || location.pathname.includes('/help')
    ? 'help'
    : 'home';

  const userInitial = (user?.name || 'R').charAt(0).toUpperCase();

  return (
    <div className="ns-shell min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Skip to Main Content */}
      <a
        href="#ns-main-content"
        className="ns-skip-link"
        data-testid="skip-to-main-link"
      >
        {t('skipToMainLabel')}
      </a>

      {/* Modern, Clean GovTech Header */}
      <header
        className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 backdrop-blur-md transition-all shadow-xs"
        role="banner"
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
          {/* Clean Brand Logo without messy Hindi text or cluttered sublines */}
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              data-testid="header-brand-link"
              className="group flex items-center gap-2.5 rounded-xl py-1 text-left transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-teal-500 text-xl shadow-sm text-white transition-opacity group-hover:opacity-95">
                🏛️
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {t('appName')}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                  GovTech India AI
                </span>
              </div>
            </Link>
          </div>

          {/* Right Controls: LanguageSwitcher & Notifications & User Menu */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher navTestId="header-lang-nav" />

            {/* Notifications Shortcut */}
            {user ? (
              <Link
                to="/notifications"
                data-testid="header-notifications-link"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs"
                title="Notifications"
                aria-label="Notifications"
              >
                <span className="text-base" aria-hidden="true">🔔</span>
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-white">
                  3
                </span>
              </Link>
            ) : null}

            {/* User Profile / Menu */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  data-testid="header-user-menu"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="ns-btn min-h-[48px] flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition hover:border-indigo-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-teal-500 text-sm font-bold text-white shadow-xs">
                    {userInitial}
                  </div>
                  <span className="hidden sm:inline-block max-w-[120px] truncate text-xs font-bold text-slate-800">
                    {user.name}
                  </span>
                  <span className="text-xs text-slate-400" aria-hidden="true">▾</span>
                </button>

                {userMenuOpen ? (
                  <div
                    role="menu"
                    data-testid="user-dropdown-menu"
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="border-b border-slate-100 pb-3 mb-2 px-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t('auth.loggedInAs')}
                      </div>
                      <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
                        {user.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        +91 {user.phone}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Link
                        to="/dashboard"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 transition-colors"
                      >
                        <span>🏛️</span>
                        <span>Citizen Dashboard</span>
                      </Link>
                      <Link
                        to="/app"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 transition-colors"
                      >
                        <span>🧭</span>
                        <span>16-Step Guided Journey</span>
                      </Link>
                      <Link
                        to="/profile"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 transition-colors"
                      >
                        <span>👤</span>
                        <span>My Profile</span>
                      </Link>
                      <Link
                        to="/dev/style-guide"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 transition-colors"
                      >
                        <span>🎨</span>
                        <span>{t('auth.navStyleGuide')}</span>
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        data-testid="logout-btn"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors text-left"
                      >
                        <span>🚪</span>
                        <span>{t('auth.logoutBtn')}</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Body with Left Sidebar (Desktop) and Content Area */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 items-stretch px-3 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Left Sidebar (Desktop) */}
        {user ? (
          <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-3 shadow-sm h-[calc(100vh-100px)] sticky top-20 overflow-y-auto">
            <div className="space-y-4">
              <div className="space-y-1">
                {navItems.map((item) => {
                  const isActive = currentNav === item.id;
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      data-testid={item.testId}
                      className={`flex min-h-[44px] items-center gap-3 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all duration-150 ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-900 border border-indigo-200 shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="text-lg" aria-hidden="true">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Citizen Persona Snapshot card */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 space-y-1 text-xs">
                <div className="font-bold text-slate-800">{user.name || 'Citizen'}</div>
                <div className="text-slate-500 text-[11px]">+91 {user.phone}</div>
                <div className="text-slate-500 text-[11px]">
                  Aadhaar: {user.aadhaarMasked || (user.phone === '9876543210' ? 'XXXX-XXXX-4821' : <span className="text-amber-600 font-semibold">Not Linked (Scan ID)</span>)}
                </div>
              </div>
            </div>

            {/* Bottom Style Guide shortcut & Logout */}
            <div className="border-t border-slate-100 pt-3 space-y-1">
              <Link
                to="/dev/style-guide"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <span>🎨</span>
                <span>{t('auth.navStyleGuide')}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer text-left"
              >
                <span>🚪</span>
                <span>{t('auth.logoutBtn')}</span>
              </button>
            </div>
          </aside>
        ) : null}

        {/* Content Area */}
        <main
          id="ns-main-content"
          className="ns-main flex-1 min-w-0 pb-20 md:pb-6"
          role="main"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      {user ? (
        <>
          <nav
            data-testid="mobile-tab-bar"
            aria-label="Mobile Navigation"
            className="fixed bottom-0 inset-x-0 z-30 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-1 backdrop-blur-md md:hidden shadow-lg"
          >
            {mobileNavItems.map((item) => {
              const isActive = currentNav === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  data-testid={item.mobileTestId}
                  className={`flex flex-col items-center justify-center py-1 px-2 text-[10px] sm:text-[11px] font-bold transition-colors ${
                    isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span className="text-lg" aria-hidden="true">{item.icon}</span>
                  <span className="truncate max-w-[64px]">{item.label}</span>
                </Link>
              );
            })}

            {/* 5th Tab: All Services Drawer Toggle (Provides 100% Mobile Parity) */}
            <button
              type="button"
              data-testid="mobile-tab-all"
              aria-label="All Services"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className={`flex flex-col items-center justify-center py-1 px-2 text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer ${
                mobileMenuOpen ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span className="text-lg" aria-hidden="true">🏛️</span>
              <span className="truncate max-w-[64px]">All (10)</span>
            </button>
          </nav>

          {/* All 10 Services Mobile Drawer (Guarantees zero options missing on Mobile) */}
          {mobileMenuOpen ? (
            <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
              <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="relative z-10 rounded-t-3xl border-t border-slate-200 bg-white p-5 shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏛️</span>
                    <div>
                      <h3 className="text-base font-black text-slate-900">All Citizen Services</h3>
                      <p className="text-[11px] font-semibold text-slate-500">10 options matching desktop</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close menu"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 overflow-y-auto overscroll-contain pb-2">
                  {navItems.map((item) => {
                    const isActive = currentNav === item.id;
                    return (
                      <Link
                        key={item.id}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 rounded-2xl p-3 text-xs font-bold transition-all border ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-900 border-indigo-200 shadow-xs'
                            : 'bg-slate-50/80 text-slate-700 border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 pt-3 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <span>🚪</span>
                    <span>{t('auth.logoutBtn')}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* Persistent Floating AI Assistant Button (hidden when on full assistant screen) */}
      {currentNav !== 'assistant' ? <FloatingAssistant /> : null}

      {/* Footer */}
      <footer
        className="ns-footer mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500"
        role="contentinfo"
        data-testid="prototype-footer"
      >
        <p>{t('footerDisclaimer')}</p>
      </footer>
    </div>
  );
}
