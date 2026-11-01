import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../state/AppContext.jsx';
import { useAuthStore } from '../state/authStore.js';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';
import { LanguageSwitcher } from '../components/LanguageSwitcher.jsx';
import { AuthBrandPanel } from '../components/AuthBrandPanel.jsx';
import { OtpInput } from '../components/ui/OtpInput.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';

export function SignupScreen() {
  const { t, language, setLanguage } = useApp();
  const navigate = useNavigate();

  const sendOtp = useAuthStore((state) => state.sendOtp);
  const verifyOtp = useAuthStore((state) => state.verifyOtp);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredLang, setPreferredLang] = useState(language);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [step, setStep] = useState('FORM'); // 'FORM' | 'OTP' | 'ONBOARDING'
  const [otpValue, setOtpValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [shake, setShake] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    if (step !== 'OTP' || resendCooldown <= 0) return undefined;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, resendCooldown]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(raw);
    setErrorMsg('');
    setIsDuplicate(false);
  };

  const isFormValid =
    name.trim().length >= 2 && phone.length === 10 && termsAccepted;

  const handleSendOtp = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setErrorMsg('');
    setIsDuplicate(false);

    if (name.trim().length < 2) {
      setErrorMsg(t('auth.errors.nameRequired'));
      triggerShake();
      return;
    }

    if (phone.length !== 10) {
      setErrorMsg(t('auth.errors.phoneInvalid'));
      triggerShake();
      return;
    }

    if (!termsAccepted) {
      setErrorMsg(t('auth.errors.termsRequired'));
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      await sendOtp({ phone, mode: 'signup', language: preferredLang });
      setStep('OTP');
      setResendCooldown(30);
      setOtpValue('');
    } catch (err) {
      triggerShake();
      if (err.code === 'DUPLICATE_PHONE') {
        setIsDuplicate(true);
        setErrorMsg(t('auth.errors.duplicatePhone'));
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
      await verifyOtp({
        phone,
        otp: otpValue,
        mode: 'signup',
        signupData: { name, language: preferredLang },
        language: preferredLang,
      });
      setLanguage(preferredLang);
      setStep('ONBOARDING');
    } catch {
      triggerShake();
      setErrorMsg(t('auth.errors.otpWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = () => {
    navigate(location.state?.from?.pathname || '/app', { replace: true });
  };

  return (
    <div
      data-testid="signup-screen"
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
              <LanguageSwitcher navTestId="signup-lang-nav" />
            </div>
          </div>

          <div className="my-auto max-w-md py-6">
            {step === 'ONBOARDING' ? (
              <div
                data-testid="signup-onboarding-modal"
                className="space-y-6 text-center"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-4xl shadow-inner text-emerald-700">
                  🎉
                </div>

                <div>
                  <h1 className="text-2xl font-black text-slate-900">
                    {t('auth.onboardingTitle')}
                  </h1>
                  <p className="mt-2 text-sm text-slate-600">
                    {t('auth.onboardingSubtitle')}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left space-y-2">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{t('auth.fullNameLabel')}:</span>
                    <strong className="text-slate-900">{name}</strong>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{t('auth.phoneLabel')}:</span>
                    <strong className="text-slate-900">+91 {phone}</strong>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{t('auth.preferredLangLabel')}:</span>
                    <strong className="text-slate-900">
                      {SUPPORTED_LANGUAGES.find((l) => l.code === preferredLang)?.nativeLabel || preferredLang}
                    </strong>
                  </div>
                </div>

                <Button
                  data-testid="onboarding-continue-btn"
                  variant="primary"
                  onClick={handleCompleteOnboarding}
                  className="w-full text-base font-bold shadow-md shadow-indigo-600/20"
                >
                  {t('auth.onboardingContinueBtn')}
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                    {step === 'FORM'
                      ? t('auth.signupTitle')
                      : t('auth.otpStepTitle')}
                  </h1>
                  <p className="mt-2 text-sm text-slate-600">
                    {step === 'FORM'
                      ? t('auth.signupSubtitle')
                      : `${t('auth.otpStepSubtitle')} +91 ${phone}`}
                  </p>
                </div>

                {errorMsg ? (
                  <div
                    data-testid="signup-error-msg"
                    role="alert"
                    className={`mb-4 flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 ${
                      shake ? 'animate-bounce' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true">⚠️</span>
                      <span>{errorMsg}</span>
                    </div>
                    {isDuplicate ? (
                      <Link
                        to="/login"
                        className="text-xs text-indigo-700 underline font-bold"
                      >
                        {t('auth.loginLink')} →
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                {step === 'FORM' ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label
                        htmlFor="signup-name"
                        className="mb-1 block text-sm font-semibold text-slate-800"
                      >
                        {t('auth.fullNameLabel')}
                      </label>
                      <Input
                        id="signup-name"
                        data-testid="signup-name-input"
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder={t('auth.fullNamePlaceholder')}
                        autoFocus
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="signup-phone"
                        className="mb-1 block text-sm font-semibold text-slate-800"
                      >
                        {t('auth.phoneLabel')}
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-sm font-bold text-slate-500">
                          🇮🇳 +91
                        </span>
                        <Input
                          id="signup-phone"
                          data-testid="signup-phone-input"
                          type="tel"
                          inputMode="numeric"
                          value={phone}
                          onChange={handlePhoneChange}
                          placeholder={t('auth.phonePlaceholder')}
                          className="pl-16 text-base tracking-wide"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="signup-lang"
                        className="mb-1 block text-sm font-semibold text-slate-800"
                      >
                        {t('auth.preferredLangLabel')}
                      </label>
                      <select
                        id="signup-lang"
                        data-testid="signup-lang-select"
                        value={preferredLang}
                        onChange={(e) => setPreferredLang(e.target.value)}
                        className="w-full min-h-[56px] rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                      >
                        {SUPPORTED_LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.nativeLabel} ({l.englishName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-1">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          data-testid="signup-terms-checkbox"
                          checked={termsAccepted}
                          onChange={(e) => {
                            setTermsAccepted(e.target.checked);
                            setErrorMsg('');
                          }}
                          className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs text-slate-600 leading-snug">
                          {t('auth.termsLabel')}
                        </span>
                      </label>
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
                      data-testid="signup-send-otp-btn"
                      variant="primary"
                      loading={loading}
                      disabled={!isFormValid || loading}
                      className="w-full text-base font-bold shadow-md shadow-indigo-600/20"
                    >
                      {loading ? t('auth.sendingOtpBtn') : t('auth.sendOtpBtn')}
                    </Button>
                  </form>
                ) : (
                  <form
                    onSubmit={handleVerifyOtp}
                    data-testid="signup-otp-step"
                    className="space-y-6"
                  >
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
                        disabled={loading}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold">
                      <button
                        type="button"
                        data-testid="signup-change-phone-btn"
                        onClick={() => {
                          setStep('FORM');
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
                          data-testid="signup-resend-otp-btn"
                          onClick={handleSendOtp}
                          disabled={loading}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {t('auth.resendNowBtn')}
                        </button>
                      )}
                    </div>

                    <Button
                      type="submit"
                      data-testid="signup-verify-otp-btn"
                      variant="primary"
                      loading={loading}
                      disabled={otpValue.length !== 6 || loading}
                      className="w-full text-base font-bold shadow-md shadow-indigo-600/20"
                    >
                      {loading ? t('auth.verifyingOtpBtn') : t('auth.verifyOtpBtn')}
                    </Button>
                  </form>
                )}

                <div className="mt-8 text-center text-sm font-medium text-slate-600">
                  {t('auth.alreadyHaveAccount')}{' '}
                  <Link
                    to="/login"
                    data-testid="signup-login-link"
                    className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    {t('auth.loginLink')}
                  </Link>
                </div>
              </>
            )}
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
