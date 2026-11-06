import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mockApi } from '../api/mockApi.js';

export const DEMO_CITIZEN = {
  id: 'CITIZEN-RAMABAI-01',
  name: 'Ramabai Kulkarni',
  phone: '9876543210',
  language: 'mr-IN',
  role: 'citizen',
  aadhaarMasked: 'XXXX-XXXX-4821',
  phoneMasked: 'XXXXXX3210',
  bankAccountMasked: 'XXXXXXXX9012',
};

export const MOCK_JWT_TOKEN = 'mock-jwt-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.nagarsathi-demo-token';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      otpSentTo: null,
      registeredUsers: [
        {
          id: 'CITIZEN-RAMABAI-01',
          name: 'Ramabai Kulkarni',
          phone: '9876543210',
          language: 'mr-IN',
          role: 'citizen',
        },
      ],
      failedAttempts: 0,
      lockedUntil: null,

      isAuthenticated: () => Boolean(get().user && get().token),

      setDemoSession: (customUser = DEMO_CITIZEN) => {
        set({
          user: customUser,
          token: MOCK_JWT_TOKEN,
          otpSentTo: null,
          failedAttempts: 0,
          lockedUntil: null,
        });
      },

      sendOtp: async ({ phone, mode = 'login', language = 'en-IN' }) => {
        const cleanedPhone = String(phone || '').replace(/\D/g, '').slice(-10);
        if (cleanedPhone.length !== 10) {
          const err = new Error('INVALID_PHONE');
          err.code = 'INVALID_PHONE';
          throw err;
        }

        const isRegistered = get().registeredUsers.some(
          (u) => u.phone === cleanedPhone
        );

        if (mode === 'signup' && isRegistered) {
          const err = new Error('DUPLICATE_PHONE');
          err.code = 'DUPLICATE_PHONE';
          throw err;
        }

        const res = await mockApi.auth.sendOtp({
          phone: cleanedPhone,
          mode,
          language,
        });

        set({
          otpSentTo: cleanedPhone,
        });

        return res;
      },

      verifyOtp: async ({ phone, otp, mode = 'login', signupData = {}, language = 'en-IN' }) => {
        const now = Date.now();
        const lockedUntil = get().lockedUntil;
        if (lockedUntil && now < lockedUntil) {
          const secondsRemaining = Math.ceil((lockedUntil - now) / 1000);
          const err = new Error(`LOCKED_${secondsRemaining}`);
          err.code = 'LOCKED';
          err.remainingSeconds = secondsRemaining;
          throw err;
        }

        const targetPhone =
          String(phone || get().otpSentTo || '').replace(/\D/g, '').slice(-10);

        if (String(otp).trim() !== '123456') {
          const newFailCount = get().failedAttempts + 1;
          let newLock = null;
          if (newFailCount >= 5) {
            newLock = Date.now() + 30000; // 30s lock
          }
          set({
            failedAttempts: newFailCount,
            lockedUntil: newLock,
          });
          const err = new Error('WRONG_OTP');
          err.code = 'WRONG_OTP';
          err.attempts = newFailCount;
          err.locked = Boolean(newLock);
          throw err;
        }

        // OTP is correct
        set({ failedAttempts: 0, lockedUntil: null });

        let citizenUser = null;
        if (mode === 'signup') {
          citizenUser = {
            id: `CITIZEN-${Date.now()}`,
            name: signupData.name || 'Citizen User',
            phone: targetPhone,
            language: signupData.language || language || 'en-IN',
            role: 'citizen',
            aadhaarMasked: null,
            phoneMasked: `XXXXXX${targetPhone.slice(-4)}`,
            bankAccountMasked: null,
            address: null,
            district: null,
            state: null,
            pincode: null,
            dob: null,
            gender: null,
            isIdVerified: false,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({
            registeredUsers: [...state.registeredUsers, citizenUser],
          }));
        } else {
          citizenUser = get().registeredUsers.find((u) => u.phone === targetPhone);
          if (!citizenUser) {
            citizenUser = {
              id: targetPhone === '9876543210' ? 'CITIZEN-RAMABAI-01' : `CITIZEN-${Date.now()}`,
              name: targetPhone === '9876543210' ? 'Ramabai Kulkarni' : 'Citizen',
              phone: targetPhone,
              language: language || 'en-IN',
              role: 'citizen',
              phoneMasked: `XXXXXX${targetPhone.slice(-4)}`,
              aadhaarMasked: targetPhone === '9876543210' ? 'XXXX-XXXX-4821' : null,
              bankAccountMasked: targetPhone === '9876543210' ? 'XXXXXXXX9012' : null,
              createdAt: new Date().toISOString(),
            };
            set((state) => ({
              registeredUsers: [...state.registeredUsers, citizenUser],
            }));
          }
        }

        const token = `mock-jwt-${citizenUser.id}-${Date.now()}`;
        set({
          user: citizenUser,
          token,
          otpSentTo: null,
        });

        await mockApi.auth.verifyOtp({
          phone: targetPhone,
          otp: '123456',
          language,
        });

        return { user: citizenUser, token };
      },

      loginWithPassword: async ({ emailOrUsername, password, rememberMe = true }) => {
        const identifier = String(emailOrUsername || '').trim();
        const pwd = String(password || '').trim();

        if (!identifier) {
          const err = new Error('EMAIL_REQUIRED');
          err.code = 'EMAIL_REQUIRED';
          throw err;
        }

        if (!pwd || pwd.length < 4) {
          const err = new Error('INVALID_PASSWORD');
          err.code = 'INVALID_PASSWORD';
          throw err;
        }

        // Generate citizen profile or link to demo citizen
        const citizenUser = {
          id: 'CITIZEN-RAMABAI-01',
          name: identifier.includes('@') ? identifier.split('@')[0] : identifier,
          phone: '9876543210',
          email: identifier.includes('@') ? identifier : `${identifier}@nagarsathi.gov.in`,
          language: get().user?.language || 'en-IN',
          role: 'citizen',
          aadhaarMasked: 'XXXX-XXXX-4821',
          phoneMasked: 'XXXXXX3210',
          bankAccountMasked: 'XXXXXXXX9012',
          createdAt: new Date().toISOString(),
        };

        const token = `mock-jwt-${citizenUser.id}-${Date.now()}`;
        set({
          user: citizenUser,
          token,
          otpSentTo: null,
          failedAttempts: 0,
          lockedUntil: null,
        });

        return { user: citizenUser, token };
      },

      signup: async ({ name: _name, phone, language = 'en-IN', termsAccepted = true }) => {
        if (!termsAccepted) {
          const err = new Error('TERMS_REQUIRED');
          err.code = 'TERMS_REQUIRED';
          throw err;
        }
        return get().sendOtp({ phone, mode: 'signup', language });
      },

      logout: async () => {
        set({
          user: null,
          token: null,
          otpSentTo: null,
          failedAttempts: 0,
          lockedUntil: null,
        });
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('nagarsathi_auth');
          }
        } catch {
          // ignore localStorage access issues in restricted contexts
        }
        await mockApi.auth.logout();
      },

      getMe: async () => {
        return mockApi.auth.me();
      },

      updateProfile: (updatedData) => {
        set((state) => {
          if (!state.user) return state;
          const merged = { ...state.user, ...updatedData };
          const updatedUsers = (state.registeredUsers || []).map((u) =>
            u.id === merged.id || u.phone === merged.phone ? { ...u, ...updatedData } : u
          );
          return {
            user: merged,
            registeredUsers: updatedUsers,
          };
        });
      },
    }),
    {
      name: 'nagarsathi_auth',
      version: 2,
      migrate: (persistedState, version) => {
        // Reset legacy unauthenticated visitors whose storage was pre-seeded with DEMO_CITIZEN
        if (!version || version < 2) {
          return {
            user: null,
            token: null,
            registeredUsers: persistedState?.registeredUsers || [],
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        registeredUsers: state.registeredUsers,
      }),
    }
  )
);

if (typeof window !== 'undefined') {
  window.__nagarsathi_auth_store = useAuthStore;
}
