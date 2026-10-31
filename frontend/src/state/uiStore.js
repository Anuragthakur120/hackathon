import { create } from 'zustand';

/**
 * Zustand UI & Design System Store for NagarSathi (MODULE UI-0).
 * Manages active phase, toasts, active modal, and accessibility motion preferences.
 */
export const useUiStore = create((set) => ({
  activePhase: 'samajhna', // 'samajhna' | 'karna' | 'peecha'
  toasts: [],
  activeModal: null,
  reducedMotion: false,

  setActivePhase: (phase) => set({ activePhase: phase }),

  pushToast: ({
    id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    message,
    variant = 'info',
  }) =>
    set((state) => ({
      toasts: [...state.toasts, { id, title, message, variant }],
    })),

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearToasts: () => set({ toasts: [] }),

  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  setReducedMotion: (reduced) => set({ reducedMotion: Boolean(reduced) }),
}));

export default useUiStore;

