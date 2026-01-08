import { useOnboardingStore } from '../store/onboardingStore';

/**
 * Hook that provides the same API as the old OnboardingContext
 * but uses the new Zustand store instead of React Context
 */
export const useOnboarding = () => {
  const {
    showOnboarding,
    isLoading,
    error,
    setShowOnboarding,
    resetOnboarding,
    checkOnboardingStatus,
    completeOnboarding,
    clearError,
  } = useOnboardingStore();

  return {
    showOnboarding,
    setShowOnboarding,
    resetOnboarding,
    checkOnboardingStatus,
    completeOnboarding,
    isLoading,
    error,
    clearError,
  };
};
