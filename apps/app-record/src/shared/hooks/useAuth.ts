import { useAuthStore } from '@/shared/auth/store/authStore';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Hook for authentication functionality
 *
 * Provides a clean interface to auth store, separating
 * component concerns from store implementation.
 */
export const useAuth = () => {
  const store = useAuthStore();

  return {
    user: store.user,
    session: store.session,
    isLoading: store.isLoading,
    isInitialized: store.isInitialized,
    signIn: store.signIn,
    signOut: store.signOut,
    initialize: store.initialize,
  };
};

export type { User, Session };
