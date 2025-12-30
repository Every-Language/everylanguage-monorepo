import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

interface ToastActions {
  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

export type ToastStore = ToastState & ToastActions;

export const useToastStore = create<ToastStore>()(
  devtools(
    (set, get) => ({
      toasts: [],

      showToast: (
        message: string,
        type: Toast['type'] = 'info',
        duration: number = 3000
      ) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newToast: Toast = { id, message, type, duration };

        set(state => ({
          toasts: [...state.toasts, newToast],
        }));

        // Auto-hide toast after duration
        if (duration > 0) {
          setTimeout(() => {
            get().hideToast(id);
          }, duration);
        }
      },

      hideToast: (id: string) => {
        set(state => ({
          toasts: state.toasts.filter(toast => toast.id !== id),
        }));
      },

      clearAllToasts: () => {
        set({ toasts: [] });
      },
    }),
    {
      name: 'toast-store',
    }
  )
);

