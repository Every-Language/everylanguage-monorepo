import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../features/auth/services/authService';
import type { AuthState } from '../../features/auth/types/auth';
import { logger } from '../utils/logger';
import { useOnboardingStore } from '../../features/onboarding/store/onboardingStore';
import { appResetService } from '../services/AppResetService';
import { signOutProgressService } from '../services/SignOutProgressService';
import { useProfileStore } from './profileStore';
import { supabase } from '../services/api/supabase';
import { userVersionCheckService } from '../../features/auth/services/userVersionCheckService';

// Logging configuration for this module
const ENABLE_LOGGING = true;

// Helper function to fetch profile data directly (not using hooks)
const fetchUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    // Transform null values to undefined for consistency with our interface
    const transformedData = {
      id: data.id,
      first_name: data.first_name || undefined,
      last_name: data.last_name || undefined,
      email: data.email || undefined,
      phone: data.phone_number || undefined,
      created_at: data.created_at || undefined,
      updated_at: data.updated_at || undefined,
    };

    // Update profile store directly
    useProfileStore.getState().setProfile(transformedData);
  } catch (error) {
    logger.error(true, 'Failed to fetch user profile:', error);
    useProfileStore
      .getState()
      .setError(
        error instanceof Error ? error.message : 'Failed to fetch profile'
      );
  }
};

// Types
export interface AuthStoreState {
  user: AuthState['user'];
  session: AuthState['session'];
  userId: string | null; // Add cached user ID for optimization
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  isVerificationRequired: boolean;
  verificationType: 'email' | 'phone' | null;
  pendingUserData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  } | null;
  needsVersionSelection: boolean;
}

export interface AuthStoreActions {
  setUser: (user: AuthState['user']) => void;
  setSession: (session: AuthState['session']) => void;
  setUserId: (userId: string | null) => void; // Add setter for user ID
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setVerificationRequired: (
    required: boolean,
    type?: 'email' | 'phone'
  ) => void;
  setPendingUserData: (data: AuthStoreState['pendingUserData']) => void;
  clearPendingUserData: () => void;
  clearVersionSelectionFlag: () => void;
  clearVerificationState: () => void;

  // Helper getter for user ID optimization
  getUserId: () => string | null;

  // Auth actions
  signIn: (email: string, password: string) => Promise<void>;
  signInWithFreshStart: (email: string, password: string) => Promise<void>;
  signInWithPhone: (phone: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    userData?: { firstName?: string; lastName?: string }
  ) => Promise<void>;
  signUpWithPhone: (
    phone: string,
    password: string,
    userData?: { firstName?: string; lastName?: string }
  ) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  completeVerification: () => Promise<void>;

  // Initialization
  initializeAuth: () => Promise<void>;
  subscribeToAuthChanges: () => () => void;

  // Version selection
  checkUserVersionNeeds: (userId: string) => Promise<void>;
}

export type AuthStore = AuthStoreState & AuthStoreActions;

// Store
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      userId: null,
      isLoading: true,
      isInitialized: false,
      error: null,
      isVerificationRequired: false,
      verificationType: null,
      pendingUserData: null,
      needsVersionSelection: false,

      // State setters
      setUser: user => {
        set({ user, userId: user?.id || null, error: null });
      },

      setSession: session => {
        set({ session, userId: session?.user?.id || null, error: null });
      },

      setUserId: userId => {
        set({ userId });
      },

      setLoading: loading => {
        set({ isLoading: loading });
      },

      setInitialized: initialized => {
        set({ isInitialized: initialized });
      },

      setError: error => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      setVerificationRequired: (
        required: boolean,
        type?: 'email' | 'phone'
      ) => {
        set({
          isVerificationRequired: required,
          verificationType: required ? type || null : null,
        });
      },

      setPendingUserData: (data: AuthStoreState['pendingUserData']) => {
        set({ pendingUserData: data });
      },

      clearPendingUserData: () => {
        set({ pendingUserData: null });
      },

      clearVersionSelectionFlag: () => {
        set({ needsVersionSelection: false });
      },

      clearVerificationState: () => {
        set({
          isVerificationRequired: false,
          verificationType: null,
          pendingUserData: null,
        });
      },

      // Helper getter for user ID optimization
      getUserId: (): string | null => {
        return get().userId;
      },

      // Auth actions
      signIn: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          const result = await authService.signIn({ email, password });

          if (result.success && result.user) {
            // Check if email is verified
            if (!result.user.email_confirmed_at) {
              // Email not verified, throw error to trigger navigation
              throw new Error('Email not confirmed');
            }

            // Email is verified, user is authenticated
            set({
              user: result.user,
              session: result.session || null,
              userId: result.user.id,
              isLoading: false,
            });

            // 🎯 FETCH PROFILE ON SIGN IN
            fetchUserProfile(result.user.id);

            // 🎯 CHECK IF USER NEEDS VERSION SELECTION
            get().checkUserVersionNeeds(result.user.id);
          } else {
            throw new Error(result.error || 'Sign in failed');
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Sign in failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      signInWithFreshStart: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          // Start sync screen
          const { useSyncScreenStore } = await import(
            '@/features/auth/store/syncScreenStore'
          );
          useSyncScreenStore.getState().startSync();

          const result = await authService.signInWithFreshStart({
            email,
            password,
          });

          if (result.success && result.user) {
            // Check if email is verified
            if (!result.user.email_confirmed_at) {
              // Email not verified, complete sync anyway
              useSyncScreenStore.getState().completeSync();
              throw new Error('Email not confirmed');
            }

            // Email is verified, user is authenticated
            set({
              user: result.user,
              session: result.session || null,
              userId: result.user.id,
              isLoading: false,
            });

            // 🎯 FETCH PROFILE ON SIGN IN
            fetchUserProfile(result.user.id);

            // 🎯 CHECK IF USER NEEDS VERSION SELECTION
            get().checkUserVersionNeeds(result.user.id);
          } else {
            // Set error in sync store
            useSyncScreenStore
              .getState()
              .setError(result.error || 'Sign in failed');
            throw new Error(result.error || 'Sign in failed');
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Sign in failed';
          set({ error: errorMessage, isLoading: false });

          // Set error in sync store if available
          try {
            const { useSyncScreenStore } = await import(
              '@/features/auth/store/syncScreenStore'
            );
            useSyncScreenStore.getState().setError(errorMessage);
          } catch {
            // Ignore if sync store not available
          }

          throw error;
        }
      },

      signInWithPhone: async (phone: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          const result = await authService.signInWithPhonePassword(
            phone,
            password
          );

          if (result.success && result.user) {
            // Check if phone is verified
            if (!result.user.phone_confirmed_at) {
              // Phone not verified, throw error to trigger navigation
              throw new Error('PHONE_NOT_VERIFIED');
            }

            // Phone is verified, user is authenticated
            set({
              user: result.user,
              session: result.session || null,
              userId: result.user.id,
              isLoading: false,
            });
          } else {
            throw new Error(result.error || 'Phone sign in failed');
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Phone sign in failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      signOut: async () => {
        try {
          set({ isLoading: true, error: null });

          // Start progress tracking
          signOutProgressService.startProgress();

          logger.info(
            ENABLE_LOGGING,
            'AuthStore: Starting sign out with reset-first strategy...'
          );

          // STEP 1: Reset onboarding FIRST to avoid flickering
          signOutProgressService.updateStep('Navigating to onboarding...', 10);
          const onboardingStore = useOnboardingStore.getState();
          await onboardingStore.resetOnboarding();

          // STEP 2: Perform comprehensive app reset (includes auth state clearing)
          signOutProgressService.updateStep('Clearing user data...', 30);
          logger.info(
            ENABLE_LOGGING,
            'AuthStore: Performing background app reset...'
          );
          await appResetService.resetApp();

          // STEP 3: Clear local auth state after app reset is complete
          signOutProgressService.updateStep('Finalizing sign out...', 95);
          set({ user: null, session: null, userId: null, isLoading: false });

          // 🎯 CLEAR PROFILE ON SIGN OUT
          useProfileStore.getState().clearProfile();

          // Complete progress
          signOutProgressService.completeProgress();

          logger.info(
            ENABLE_LOGGING,
            'AuthStore: Sign out completed successfully with reset-first strategy'
          );
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Sign out failed';
          set({ error: errorMessage, isLoading: false });

          // Hide progress on error
          signOutProgressService.hideProgress();

          logger.error(
            ENABLE_LOGGING,
            'AuthStore: Sign out failed:',
            errorMessage
          );
          throw error;
        }
      },

      signUp: async (
        email: string,
        password: string,
        userData?: { firstName?: string; lastName?: string }
      ) => {
        try {
          logger.info(ENABLE_LOGGING, 'AuthStore: Starting signUp process', {
            email,
            hasUserData: !!userData,
          });
          set({ isLoading: true, error: null });
          const result = await authService.signUp({ email, password });

          logger.info(ENABLE_LOGGING, 'AuthStore: SignUp result', {
            success: result.success,
            hasUser: !!result.user,
            hasSession: !!result.session,
          });

          if (result.success && result.user) {
            // Store pending user data for later use after verification
            if (userData) {
              set({
                pendingUserData: {
                  ...(userData.firstName && { firstName: userData.firstName }),
                  ...(userData.lastName && { lastName: userData.lastName }),
                  email: email,
                },
              });
            }

            // Sign up always requires verification - don't authenticate immediately
            logger.info(
              ENABLE_LOGGING,
              'AuthStore: Sign up completed, verification required'
            );
            set({
              isLoading: false,
              // Don't set user or session - user needs to verify first
            });
          } else {
            set({ error: result.error || 'Sign up failed', isLoading: false });
            throw new Error(result.error || 'Sign up failed');
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Sign up failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      signUpWithPhone: async (
        phone: string,
        password: string,
        userData?: { firstName?: string; lastName?: string }
      ) => {
        try {
          set({ isLoading: true, error: null });
          const result = await authService.signUpWithPhone(phone, password);

          if (result.success && result.user) {
            // Store pending user data for later use after verification
            if (userData) {
              set({
                pendingUserData: {
                  ...(userData.firstName && { firstName: userData.firstName }),
                  ...(userData.lastName && { lastName: userData.lastName }),
                  phone: phone,
                },
              });
            }

            // Sign up always requires verification - don't authenticate immediately
            set({
              isLoading: false,
              // Don't set user or session - user needs to verify first
            });
          } else {
            set({
              error: result.error || 'Phone sign up failed',
              isLoading: false,
            });
            throw new Error(result.error || 'Phone sign up failed');
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Phone sign up failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      resetPassword: async (email: string) => {
        try {
          set({ isLoading: true, error: null });
          await authService.resetPassword(email);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Password reset failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      completeVerification: async () => {
        try {
          set({ isLoading: true, error: null });

          // Get current session after verification
          const session = await authService.getCurrentSession();

          if (session?.user) {
            // Save pending user data if available
            const { pendingUserData } = get();
            if (pendingUserData?.firstName && pendingUserData?.lastName) {
              await authService.updateProfileNames(
                pendingUserData.firstName,
                pendingUserData.lastName
              );
            }

            // Clear verification state and update auth state
            set({
              user: session.user,
              session: session,
              userId: session.user.id,
              isVerificationRequired: false,
              verificationType: null,
              pendingUserData: null,
              isLoading: false,
            });
          } else {
            set({
              error: 'No session found after verification',
              isLoading: false,
            });
            throw new Error('No session found after verification');
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Verification completion failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Initialization
      initializeAuth: async () => {
        try {
          set({ isLoading: true, error: null });
          await authService.ensureSessionIfOnline();
          const session = await authService.getCurrentSession();
          set({
            user: session?.user ?? null,
            session,
            userId: session?.user?.id ?? null,
            isLoading: false,
            isInitialized: true,
            // Clear verification state on initialization
            isVerificationRequired: false,
            verificationType: null,
            pendingUserData: null,
          });

          // 🎯 FETCH PROFILE ON INITIALIZATION IF USER EXISTS
          if (session?.user?.id) {
            fetchUserProfile(session.user.id);
          }
        } catch (error) {
          logger.error(ENABLE_LOGGING, 'Failed to initialize auth:', error);
          set({
            user: null,
            session: null,
            userId: null,
            isLoading: false,
            isInitialized: true,
            error: 'Failed to initialize authentication',
            // Clear verification state on error
            isVerificationRequired: false,
            verificationType: null,
            pendingUserData: null,
          });
        }
      },

      subscribeToAuthChanges: () => {
        const {
          data: { subscription },
        } = authService.onAuthStateChange(
          (_event: string, session: unknown) => {
            const typedSession = session as { user?: AuthState['user'] } | null;
            set({
              user: typedSession?.user ?? null,
              session: typedSession as AuthState['session'],
              userId: typedSession?.user?.id ?? null,
              isLoading: false,
              isInitialized: true,
              error: null,
              // Clear verification state when auth state changes (user signs in/out)
              isVerificationRequired: false,
              verificationType: null,
              pendingUserData: null,
            });

            // 🎯 SYNC PROFILE WITH AUTH STATE CHANGES
            if (typedSession?.user?.id) {
              fetchUserProfile(typedSession.user.id);
            } else {
              useProfileStore.getState().clearProfile();
            }
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      },

      // Version selection
      checkUserVersionNeeds: async (userId: string) => {
        try {
          logger.info(
            ENABLE_LOGGING,
            'AuthStore: Checking version needs for user:',
            userId
          );

          const result =
            await userVersionCheckService.checkUserVersionNeeds(userId);

          if (result.needsVersionSelection) {
            logger.info(
              ENABLE_LOGGING,
              'AuthStore: User needs version selection, reason:',
              result.reason
            );

            // Store the flag that user needs version selection
            // This will be used by the app to show the modal
            set({ needsVersionSelection: true });
          } else {
            logger.info(
              ENABLE_LOGGING,
              'AuthStore: User does not need version selection, reason:',
              result.reason
            );
            set({ needsVersionSelection: false });
          }
        } catch (error) {
          logger.error(
            ENABLE_LOGGING,
            'AuthStore: Error checking version needs:',
            error
          );
          // On error, don't show version selection modal
          set({ needsVersionSelection: false });
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user and session, not loading/error states
      partialize: state => ({
        user: state.user,
        session: state.session,
        userId: state.userId,
        isInitialized: state.isInitialized,
        isVerificationRequired: state.isVerificationRequired,
        verificationType: state.verificationType,
        pendingUserData: state.pendingUserData,
      }),
    }
  )
);

// Initialize auth store
export const initializeAuthStore = async () => {
  const store = useAuthStore.getState();

  try {
    await store.initializeAuth();
    const unsubscribe = store.subscribeToAuthChanges();

    // Return cleanup function
    return unsubscribe;
  } catch (error) {
    logger.error(ENABLE_LOGGING, 'Failed to initialize auth store:', error);
    return () => {}; // Return empty cleanup function
  }
};
