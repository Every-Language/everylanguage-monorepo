import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/shared/infrastructure/supabase/client';
import { powerSyncSystem } from '@/shared/infrastructure/powersync/services/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthStoreState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthStoreActions {
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (isLoading: boolean) => void;
  setInitialized: (isInitialized: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export type AuthStore = AuthStoreState & AuthStoreActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    set => {
      let authStateChangeSubscription: ReturnType<
        typeof supabase.auth.onAuthStateChange
      > | null = null;

      return {
        user: null,
        session: null,
        isLoading: false,
        isInitialized: false,

        setUser: user => set({ user }),
        setSession: session => set({ session }),
        setLoading: isLoading => set({ isLoading }),
        setInitialized: isInitialized => set({ isInitialized }),

        initialize: async () => {
          // Clean up existing listener if any
          if (authStateChangeSubscription) {
            authStateChangeSubscription.data.subscription.unsubscribe();
            authStateChangeSubscription = null;
          }

          set({ isLoading: true });
          try {
            const {
              data: { session },
              error,
            } = await supabase.auth.getSession();

            if (error) {
              throw error;
            }

            set({
              session: session ?? null,
              user: session?.user ?? null,
              isInitialized: true,
            });

            // Set up auth state change listener
            authStateChangeSubscription = supabase.auth.onAuthStateChange(
              (event: AuthChangeEvent, session: Session | null) => {
                logger.info(
                  `Auth state changed: ${event}`,
                  session?.user?.email
                );
                set({
                  session,
                  user: session?.user ?? null,
                });
              }
            );
          } catch (error) {
            const err =
              error instanceof Error
                ? error
                : new Error('Auth initialization failed');
            logger.error('Auth initialization failed:', err);
            set({ isInitialized: true }); // Mark as initialized even on error
          } finally {
            set({ isLoading: false });
          }
        },

        signIn: async (email: string, password: string) => {
          set({ isLoading: true });
          try {
            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (error) throw error;

            set({ session: data.session, user: data.user });
            logger.info('User signed in successfully', email);
          } catch (error) {
            const err =
              error instanceof Error ? error : new Error('Sign in failed');
            logger.error('Sign in failed:', err);
            throw err;
          } finally {
            set({ isLoading: false });
          }
        },

        signOut: async () => {
          set({ isLoading: true });
          try {
            // Disconnect PowerSync before signing out
            // This prevents sync attempts with invalid credentials
            if (powerSyncSystem.isConnected) {
              try {
                await powerSyncSystem.disconnect();
                logger.info('PowerSync disconnected on sign out');
              } catch (error) {
                // Non-fatal: log but continue with sign out
                logger.warn(
                  'Failed to disconnect PowerSync on sign out:',
                  error
                );
              }
            }

            await supabase.auth.signOut();
            set({ session: null, user: null });
            logger.info('User signed out successfully');

            // Clean up auth listener
            if (authStateChangeSubscription) {
              authStateChangeSubscription.data.subscription.unsubscribe();
              authStateChangeSubscription = null;
            }
          } catch (error) {
            const err =
              error instanceof Error ? error : new Error('Sign out failed');
            logger.error('Sign out failed:', err);
            throw err;
          } finally {
            set({ isLoading: false });
          }
        },
      };
    },
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
);
