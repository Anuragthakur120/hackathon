import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useApp } from '../state/AppContext.jsx';
import { useAuthStore } from '../state/authStore.js';
import { LanguageSwitcher } from '../components/LanguageSwitcher.jsx';
import { AuthBrandPanel } from '../components/AuthBrandPanel.jsx';
import { OtpInput } from '../components/ui/OtpInput.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';

export function LoginScreen() {
  const { t, language } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const sendOtp = useAuthStore((state) => state.sendOtp);
  const verifyOtp = useAuthStore((state) => state.verifyOtp);

  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('PHONE'); // 'PHONE' | 'OTP'
  const [otpValue, setOtpValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [lockedUntilState, setLockedUntilState] = useState(null);

  // Determine return target after successful login (original route if redirected, otherwise citizen dashboard)
  const returnTo = location.state?.from?.pathname || '/dashboard';

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

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(raw);
    setErrorMsg('');
  };

  const handleSendOtp = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setErrorMsg('');

    if (phone.length !== 10) {
      setErrorMsg(t('auth.errors.phoneInvalid'));
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

  return (
    <div
      data-testid="login-screen"
      className="flex min-h-[calc(100vh-80px)] w-full items-stretch justify-center bg-slate-50 py-4 px-3 sm:px-6 lg:px-8"
    >
      <div className="flex w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        {/* Left Side: Brand & Phase Explainer Panel */}
        <AuthBrandPanel />

        {/* Right Side: Form Card */}
        <div className="flex w-full flex-col justify-between p-6 sm:p-10 lg:w-1/2">
          {/* Header Row: Switcher & Logo on Mobile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="text-2xl" aria-hidden="true">🏛️</span>
              <span className="text-lg font-black text-slate-900">NagarSathi</span>
            </div>
            <div className="ml-auto">
              <LanguageSwitcher navTestId="login-lang-nav" />
            </div>
          </div>

          <div className="my-auto max-w-md py-6">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {step === 'PHONE' ? t('auth.loginTitle') : t('auth.otpStepTitle')}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {step === 'PHONE'
                  ? t('auth.loginSubtitle')
                  : `${t('auth.otpStepSubtitle')} +91 ${phone}`}
              </p>
            </div>

            {errorMsg ? (
              <div
                data-testid="login-error-msg"
                role="alert"
                className={`mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 ${
                  shake ? 'animate-bounce' : ''
                }`}
              >
                <span aria-hidden="true">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            ) : null}

            {step === 'PHONE' ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label
                    htmlFor="login-phone"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    {t('auth.phoneLabel')}
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-sm font-bold text-slate-500">
                      🇮🇳 +91
                    </span>
                    <Input
                      id="login-phone"
                      data-testid="login-phone-input"
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder={t('auth.phonePlaceholder')}
                      className="pl-16 text-base tracking-wide"
                      autoFocus
                    />
                  </div>
                </div>

                <div
                  data-testid="mock-otp-hint"
                  className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-900 font-medium flex items-center gap-2"
                >
                  <span>💡</span>
                  <span>{t('auth.mockOtpHint')}</span>
                </div>

                <Button
                  type="submit"
                  data-testid="login-send-otp-btn"
                  variant="primary"
                  loading={loading}
                  disabled={phone.length !== 10 || loading}
                  className="w-full text-base font-bold shadow-md shadow-indigo-600/20"
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

                <div className="flex items-center justify-between text-xs font-semibold">
                  <button
                    type="button"
                    data-testid="login-change-phone-btn"
                    onClick={() => {
                      setStep('PHONE');
                      setErrorMsg('');
                      setOtpValue('');
                    }}
                    className="text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    {t('auth.changePhoneBtn')}
                  </button>

                  {resendCooldown > 0 ? (
                    <span className="text-slate-500">
                      {t('auth.resendInLabel')} {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-testid="login-resend-otp-btn"
                      onClick={handleSendOtp}
                      disabled={loading || Boolean(lockedUntilState)}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline"
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
                  className="w-full text-base font-bold shadow-md shadow-indigo-600/20"
                >
                  {loading ? t('auth.verifyingOtpBtn') : t('auth.verifyOtpBtn')}
                </Button>
              </form>
            )}

            <div className="mt-8 text-center text-sm font-medium text-slate-600">
              {t('auth.newHere')}{' '}
              <Link
                to="/signup"
                data-testid="login-signup-link"
                className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                {t('auth.signupLink')}
              </Link>
            </div>
          </div>

          {/* Trust Strip */}
          <div
            data-testid="auth-trust-strip"
            className="border-t border-slate-100 pt-4 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5"
          >
            <span aria-hidden="true">🛡️</span>
            <span>{t('auth.trustStrip')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

