import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useApp } from '../state/AppContext.jsx';
import { useAuthStore } from '../state/authStore.js';
import { LanguageSwitcher } from '../components/LanguageSwitcher.jsx';
import { AuthBrandPanel } from '../components/AuthBrandPanel.jsx';
import { OtpInput } from '../components/ui/OtpInput.jsx';
import { Button } from '../components/ui/Button.jsx';

export function LoginScreen() {
  const { t, language } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const sendOtp = useAuthStore((state) => state.sendOtp);
  const verifyOtp = useAuthStore((state) => state.verifyOtp);
  const loginWithPassword = useAuthStore((state) => state.loginWithPassword);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  // Determine return target after successful login (original route if redirected, otherwise citizen dashboard)
  const returnTo = location.state?.from?.pathname || '/dashboard';

  // State for auth method: 'OTP' (default) or 'PASSWORD'
  const [authMethod, setAuthMethod] = useState('OTP');

  // Mobile OTP state
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('PHONE'); // 'PHONE' | 'OTP'
  const [otpValue, setOtpValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [lockedUntilState, setLockedUntilState] = useState(null);

  // Email / Password state
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [forgotModal, setForgotModal] = useState(false);

  // Cooldown timer for OTP resend
  useEffect(() => {
    if (step !== 'OTP' || resendCooldown <= 0) return undefined;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, resendCooldown]);

  // Lockout countdown
  useEffect(() => {
    if (!lockedUntilState) return undefined;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntilState - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntilState(null);
        setErrorMsg('');
      } else {
        setErrorMsg(`${t('auth.errors.otpLocked')} (${remaining}s)`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntilState, t]);

  const shakeTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    };
  }, []);

  // If already authenticated, redirect to /dashboard (or returnTo) immediately
  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  const triggerShake = () => {
    setShake(true);
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    shakeTimeoutRef.current = setTimeout(() => {
      setShake(false);
    }, 600);
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(raw);
    setErrorMsg('');
    setFieldErrors({});
  };

  const handleSendOtp = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setErrorMsg('');
    setFieldErrors({});

    if (phone.length !== 10) {
      setErrorMsg(t('auth.errors.phoneInvalid'));
      setFieldErrors({ phone: t('auth.errors.phoneInvalid') });
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      await sendOtp({ phone, mode: 'login', language });
      setStep('OTP');
      setResendCooldown(30);
      setOtpValue('');
    } catch (err) {
      triggerShake();
      if (err.code === 'USER_NOT_FOUND') {
        setErrorMsg(t('auth.errors.userNotFound'));
      } else if (err.code === 'INVALID_PHONE') {
        setErrorMsg(t('auth.errors.phoneInvalid'));
      } else {
        setErrorMsg(err.message || 'Error sending OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setErrorMsg('');

    if (otpValue.length !== 6) {
      setErrorMsg(t('auth.errors.otpIncomplete'));
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      await verifyOtp({ phone, otp: otpValue, mode: 'login', language });
      navigate(returnTo, { replace: true });
    } catch (err) {
      triggerShake();
      if (err.code === 'LOCKED') {
        setLockedUntilState(Date.now() + (err.remainingSeconds || 30) * 1000);
        setErrorMsg(t('auth.errors.otpLocked'));
      } else if (err.code === 'WRONG_OTP') {
        if (err.locked) {
          setLockedUntilState(Date.now() + 30000);
          setErrorMsg(t('auth.errors.otpLocked'));
        } else {
          setErrorMsg(t('auth.errors.otpWrong'));
        }
      } else {
        setErrorMsg(err.message || 'Verification failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setErrorMsg('');
    const errors = {};

    if (!emailOrUsername.trim()) {
      errors.email = 'Please enter your email or username';
    }
    if (!password.trim()) {
      errors.password = 'Please enter your password';
    } else if (password.length < 4) {
      errors.password = 'Password must be at least 4 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      triggerShake();
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      await loginWithPassword({ emailOrUsername, password, rememberMe });
      navigate(returnTo, { replace: true });
    } catch (err) {
      triggerShake();
      if (err.code === 'INVALID_PASSWORD') {
        setErrorMsg('Invalid email/username or password. Please try again.');
      } else {
        setErrorMsg(err.message || 'Login failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="login-screen"
      className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-teal-50/20 py-6 px-3 sm:px-6 lg:px-8 pb-28 sm:pb-12"
    >
      <div className="flex w-full max-w-5xl flex-col lg:flex-row overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-2xl transition-all">
        {/* Left Side: Brand & Phase Explainer Panel (Desktop & Tablet) */}
        <AuthBrandPanel />

        {/* Right Side: Form Card */}
        <div className="flex w-full flex-col justify-between p-6 sm:p-10 lg:w-1/2">
          {/* Header Row: Switcher & Logo */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-teal-500 text-xl text-white shadow-md shadow-indigo-600/20">
                🏛️
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                  NagarSathi
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                  GovTech India AI
                </span>
              </div>
            </div>

            {/* Language Switcher with smooth downward opening */}
            <div className="ml-auto">
              <LanguageSwitcher navTestId="login-lang-nav" />
            </div>
          </div>

          <div className="my-auto max-w-md w-full mx-auto py-6 sm:py-8">
            {/* Welcome Heading & Subtext */}
            <div className="mb-6 sm:mb-8 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 mb-3 border border-indigo-100">
                <span>🔐</span>
                <span>{step === 'PHONE' ? 'Citizen Sign In' : 'Verification Step'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {step === 'PHONE' ? t('auth.loginTitle') : t('auth.otpStepTitle')}
              </h1>
              <p className="mt-1.5 text-sm font-medium text-slate-600">
                {step === 'PHONE'
                  ? 'Login to continue to NagarSathi'
                  : `${t('auth.otpStepSubtitle')} +91 ${phone}`}
              </p>
            </div>

            {/* Global Error Alert Banner */}
            {errorMsg ? (
              <div
                data-testid="login-error-msg"
                role="alert"
                className={`mb-5 flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-sm font-bold text-rose-800 shadow-xs ${
                  shake ? 'animate-bounce' : ''
                }`}
              >
                <span className="text-base" aria-hidden="true">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            ) : null}

            {/* Segmented Auth Method Tabs (Active when on initial sign-in step) */}
            {step === 'PHONE' && (
              <div
                className="flex rounded-2xl bg-slate-100 p-1 mb-6 border border-slate-200/60 select-none"
                role="tablist"
                aria-label="Login Methods"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMethod === 'OTP'}
                  onClick={() => {
                    setAuthMethod('OTP');
                    setErrorMsg('');
                    setFieldErrors({});
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    authMethod === 'OTP'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span aria-hidden="true">📱</span>
                  <span>Mobile OTP</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMethod === 'PASSWORD'}
                  onClick={() => {
                    setAuthMethod('PASSWORD');
                    setErrorMsg('');
                    setFieldErrors({});
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    authMethod === 'PASSWORD'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span aria-hidden="true">✉️</span>
                  <span>Email & Password</span>
                </button>
              </div>
            )}

            {/* ===================== TAB 1: MOBILE OTP FLOW ===================== */}
            {authMethod === 'OTP' && (
              <>
                {step === 'PHONE' ? (
                  <form onSubmit={handleSendOtp} className="space-y-5">
                    <div>
                      <label
                        htmlFor="login-phone"
                        className="mb-2 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700"
                      >
                        {t('auth.phoneLabel')}
                      </label>
                      <div className="relative flex items-center rounded-2xl border-2 border-slate-200 bg-white shadow-xs transition-all duration-200 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/20 hover:border-slate-300">
                        <span className="flex items-center gap-1.5 pl-4 pr-3 text-sm font-bold text-slate-600 border-r border-slate-200 select-none">
                          <span aria-hidden="true">🇮🇳</span>
                          <span>+91</span>
                        </span>
                        <input
                          id="login-phone"
                          data-testid="login-phone-input"
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          value={phone}
                          onChange={handlePhoneChange}
                          placeholder={t('auth.phonePlaceholder')}
                          aria-label={t('auth.phoneLabel')}
                          className="w-full min-h-[52px] bg-transparent py-3 pl-3 pr-4 text-base sm:text-lg font-bold tracking-wider text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none border-0"
                          autoFocus
                        />
                      </div>
                      {fieldErrors.phone && (
                        <p className="mt-1.5 text-xs font-semibold text-rose-600">
                          {fieldErrors.phone}
                        </p>
                      )}
                    </div>

                    <div
                      data-testid="mock-otp-hint"
                      className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-indigo-50/90 p-3.5 text-xs text-indigo-950 font-semibold flex items-center gap-2.5 shadow-xs"
                    >
                      <span className="text-base" aria-hidden="true">💡</span>
                      <span>{t('auth.mockOtpHint')}</span>
                    </div>

                    <Button
                      type="submit"
                      data-testid="login-send-otp-btn"
                      variant="primary"
                      loading={loading}
                      disabled={phone.length !== 10 || loading}
                      className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-600 text-base font-bold text-white shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                      {loading ? t('auth.sendingOtpBtn') : t('auth.sendOtpBtn')}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} data-testid="login-otp-step" className="space-y-6">
                    <div>
                      <OtpInput
                        length={6}
                        value={otpValue}
                        onChange={(val) => {
                          setOtpValue(val);
                          setErrorMsg('');
                        }}
                        onComplete={(val) => {
                          setOtpValue(val);
                        }}
                        error={Boolean(errorMsg)}
                        disabled={loading || Boolean(lockedUntilState)}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                      <button
                        type="button"
                        data-testid="login-change-phone-btn"
                        onClick={() => {
                          setStep('PHONE');
                          setErrorMsg('');
                          setOtpValue('');
                        }}
                        className="text-indigo-600 hover:text-indigo-800 hover:underline transition-colors cursor-pointer"
                      >
                        ← {t('auth.changePhoneBtn')}
                      </button>

                      {resendCooldown > 0 ? (
                        <span className="text-slate-500 font-medium">
                          {t('auth.resendInLabel')} <span className="font-bold text-indigo-700">{resendCooldown}s</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          data-testid="login-resend-otp-btn"
                          onClick={handleSendOtp}
                          disabled={loading || Boolean(lockedUntilState)}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline transition-colors cursor-pointer font-bold"
                        >
                          {t('auth.resendNowBtn')}
                        </button>
                      )}
                    </div>

                    <Button
                      type="submit"
                      data-testid="login-verify-otp-btn"
                      variant="primary"
                      loading={loading}
                      disabled={otpValue.length !== 6 || loading || Boolean(lockedUntilState)}
                      className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-600 text-base font-bold text-white shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                      {loading ? t('auth.verifyingOtpBtn') : t('auth.verifyOtpBtn')}
                    </Button>
                  </form>
                )}
              </>
            )}

            {/* ===================== TAB 2: EMAIL / PASSWORD FLOW ===================== */}
            {authMethod === 'PASSWORD' && step === 'PHONE' && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                {/* Email / Username Field */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-1.5 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700"
                  >
                    Email or Username
                  </label>
                  <div className="relative flex items-center rounded-2xl border-2 border-slate-200 bg-white shadow-xs transition-all duration-200 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/20 hover:border-slate-300">
                    <span className="pl-4 pr-2 text-slate-400 select-none text-base" aria-hidden="true">
                      ✉️
                    </span>
                    <input
                      id="login-email"
                      data-testid="login-email-input"
                      type="text"
                      autoComplete="username"
                      value={emailOrUsername}
                      onChange={(e) => {
                        setEmailOrUsername(e.target.value);
                        setErrorMsg('');
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => ({ ...prev, email: '' }));
                        }
                      }}
                      placeholder="citizen@nagarsathi.in or ramabai"
                      aria-label="Email or Username"
                      className="w-full min-h-[52px] bg-transparent py-3 pl-2 pr-4 text-sm sm:text-base font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none border-0"
                      autoFocus
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="mt-1.5 text-xs font-semibold text-rose-600">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Password Field with Show/Hide Toggle */}
                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-1.5 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700"
                  >
                    Password
                  </label>
                  <div className="relative flex items-center rounded-2xl border-2 border-slate-200 bg-white shadow-xs transition-all duration-200 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/20 hover:border-slate-300">
                    <span className="pl-4 pr-2 text-slate-400 select-none text-base" aria-hidden="true">
                      🔒
                    </span>
                    <input
                      id="login-password"
                      data-testid="login-password-input"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMsg('');
                        if (fieldErrors.password) {
                          setFieldErrors((prev) => ({ ...prev, password: '' }));
                        }
                      }}
                      placeholder="Enter your password"
                      aria-label="Password"
                      className="w-full min-h-[52px] bg-transparent py-3 pl-2 pr-12 text-sm sm:text-base font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none border-0"
                    />
                    <button
                      type="button"
                      data-testid="login-toggle-password"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <span className="text-sm" aria-hidden="true">
                        {showPassword ? '🙈' : '👁️'}
                      </span>
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1.5 text-xs font-semibold text-rose-600">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div className="flex items-center justify-between text-xs sm:text-sm pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      data-testid="login-remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-700">Remember me</span>
                  </label>

                  <button
                    type="button"
                    data-testid="login-forgot-password"
                    onClick={() => setForgotModal(true)}
                    className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Password Demo Hint */}
                <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-indigo-50/90 p-3 text-xs text-indigo-950 font-semibold flex items-center gap-2 shadow-xs">
                  <span className="text-base" aria-hidden="true">💡</span>
                  <span>Demo access: Use username <strong>ramabai</strong> or your email to continue.</span>
                </div>

                {/* Primary Submit Button */}
                <Button
                  type="submit"
                  data-testid="login-password-submit-btn"
                  variant="primary"
                  loading={loading}
                  disabled={loading}
                  className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-600 text-base font-bold text-white shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {loading ? 'Authenticating...' : 'Sign In to NagarSathi →'}
                </Button>
              </form>
            )}

            {/* Signup Link */}
            <div className="mt-8 text-center text-sm font-semibold text-slate-600">
              {t('auth.newHere')}{' '}
              <Link
                to="/signup"
                data-testid="login-signup-link"
                className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
              >
                {t('auth.signupLink')}
              </Link>
            </div>
          </div>

          {/* Mobile Highlights Section: Ensures 100% option & feature parity on Mobile */}
          <div className="lg:hidden mt-6 mb-4 space-y-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800 mb-2 flex items-center gap-1.5">
              <span>🏛️</span>
              <span>{t('phaseExplainerTitle')}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                <span className="text-base" aria-hidden="true">🎙️</span>
                <span className="font-bold text-slate-800">{t('auth.phase1Title')}</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                <span className="text-base" aria-hidden="true">📝</span>
                <span className="font-bold text-slate-800">{t('auth.phase2Title')}</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                <span className="text-base" aria-hidden="true">🔍</span>
                <span className="font-bold text-slate-800">{t('auth.phase3Title')}</span>
              </div>
            </div>
          </div>

          {/* Trust Strip */}
          <div
            data-testid="auth-trust-strip"
            className="border-t border-slate-100 pt-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2 font-medium"
          >
            <span aria-hidden="true" className="text-sm">🛡️</span>
            <span>{t('auth.trustStrip')}</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Accessible Modal */}
      {forgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-700 mb-4">
              🔑
            </div>
            <h2 id="forgot-modal-title" className="text-lg font-black text-slate-900">
              Reset Your Credentials
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              For security, NagarSathi accounts are linked to your Aadhaar & Indian mobile number. You can sign in directly using <strong>Mobile OTP</strong> verification, or visit your nearest Taluka CSC center for account recovery.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  setForgotModal(false);
                  setAuthMethod('OTP');
                }}
                className="w-full rounded-xl bg-indigo-600 text-sm font-bold text-white py-2.5 cursor-pointer"
              >
                Use Mobile OTP Instead →
              </Button>
              <button
                type="button"
                onClick={() => setForgotModal(false)}
                className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
