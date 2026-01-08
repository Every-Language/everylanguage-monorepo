import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../../shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

// Types
export interface OnboardingState {
  showOnboarding: boolean | null;
  isLoading: boolean;
  error: string | null;
  isResetting: boolean; // New state for reset operations
  isSignOutInitiated: boolean; // Flag to show sign out modal immediately
}

export interface OnboardingActions {
  setShowOnboarding: (show: boolean) => void;
  resetOnboarding: () => Promise<void>;
  checkOnboardingStatus: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  clearError: () => void;
  setResetting: (resetting: boolean) => void;
  setSignOutInitiated: (initiated: boolean) => void;
}

export type OnboardingStore = OnboardingState & OnboardingActions;

// Store
export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    set => ({
      // Initial state
      showOnboarding: null,
      isLoading: false,
      error: null,
      isResetting: false,
      isSignOutInitiated: false,

      // Actions
      setShowOnboarding: (show: boolean) => {
        set({ showOnboarding: show, error: null });
      },

      resetOnboarding: async () => {
        try {
          set({ isLoading: true, error: null });
          await AsyncStorage.removeItem('@bible_app_onboarding');
          set({ showOnboarding: true, isLoading: false });
        } catch (error) {
          logger.error(ENABLE_LOGGING, 'Failed to reset onboarding:', error);
          set({
            error: 'Failed to reset onboarding',
            isLoading: false,
          });
        }
      },

      checkOnboardingStatus: async () => {
        try {
          set({ isLoading: true, error: null });
          const stored = await AsyncStorage.getItem('@bible_app_onboarding');

          if (stored) {
            const onboardingState = JSON.parse(stored);
            set({
              showOnboarding: !onboardingState.isCompleted,
              isLoading: false,
            });
          } else {
            set({ showOnboarding: true, isLoading: false });
          }
        } catch (error) {
          logger.error(
            ENABLE_LOGGING,
            'Failed to check onboarding status:',
            error
          );
          set({
            showOnboarding: true,
            error: 'Failed to check onboarding status',
            isLoading: false,
          });
        }
      },

      completeOnboarding: async () => {
        try {
          set({ isLoading: true, error: null });
          await AsyncStorage.setItem(
            '@bible_app_onboarding',
            JSON.stringify({ isCompleted: true })
          );
          set({ showOnboarding: false, isLoading: false });
        } catch (error) {
          logger.error(
            ENABLE_LOGGING,
            'Failed to save onboarding completion:',
            error
          );
          set({
            showOnboarding: false,
            error: 'Failed to save onboarding completion',
            isLoading: false,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setResetting: (resetting: boolean) => {
        set({ isResetting: resetting });
      },

      setSignOutInitiated: (initiated: boolean) => {
        set({ isSignOutInitiated: initiated });
      },
    }),
    {
      name: 'onboarding-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the showOnboarding state, not loading/error states
      partialize: state => ({ showOnboarding: state.showOnboarding }),
    }
  )
);
