import { useAuthStore } from '../../../shared/store/authStore';
import type { AuthContextValue } from '../types/auth';

/**
 * Hook that provides the same API as the old AuthProvider
 * but uses the new Zustand store instead of React Context
 */
export const useAuthContext = (): AuthContextValue => {
  const {
    user,
    session,
    isLoading,
    isInitialized,
    isVerificationRequired,
    verificationType,
    signIn,
    signInWithFreshStart,
    signInWithPhone,
    signOut,
    signUp,
    signUpWithPhone,
    resetPassword,
    completeVerification,
    clearVerificationState,
  } = useAuthStore();

  return {
    user,
    session,
    isLoading,
    isInitialized,
    signIn,
    signInWithFreshStart,
    signInWithPhone,
    signOut,
    signUp,
    signUpWithPhone,
    resetPassword,
    completeVerification,
    clearVerificationState,
    isVerificationRequired,
    verificationType,
  };
};

export const useAuthFromStore = () => {
  const {
    user,
    session,
    userId, // Add the cached userId
    isLoading,
    isInitialized,
    error,
    setUser,
    setSession,
    setUserId,
    setLoading,
    setInitialized,
    setError,
    clearError,
    getUserId,
    signIn,
    signOut,
    signUp,
    resetPassword,
    initializeAuth,
    subscribeToAuthChanges,
  } = useAuthStore();

  return {
    user,
    session,
    userId, // Expose the cached userId
    isLoading,
    isInitialized,
    error,
    setUser,
    setSession,
    setUserId,
    setLoading,
    setInitialized,
    setError,
    clearError,
    getUserId, // Helper method to get user ID without async call
    signIn,
    signOut,
    signUp,
    resetPassword,
    initializeAuth,
    subscribeToAuthChanges,
  };
};
