import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/shared/infrastructure/supabase/client';
import { powerSyncSystem } from '@/shared/infrastructure/powersync/services/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

/**
 * Update local projects with user_id after sign-in
 * Only updates projects where created_by IS NULL to avoid overwriting existing assignments
 */
async function updateProjectsWithUserId(userId: string): Promise<void> {
  if (!powerSyncSystem.isInitialized) {
    logger.warn(
      'PowerSync not initialized, skipping project update with user_id'
    );
    return;
  }

  try {
    const result = await powerSyncSystem.execute(
      `UPDATE projects 
       SET created_by = ? 
       WHERE created_by IS NULL`,
      [userId]
    );

    logger.info('Updated projects with user_id', { userId, result });
  } catch (error) {
    logger.error('Failed to update projects with user_id:', error);
    // Non-fatal: continue even if update fails
  }
}

/**
 * Validate that all local projects will pass RLS checks before syncing
 * Checks that projects have created_by matching current user
 */
async function validateProjectsForSync(userId: string): Promise<void> {
  if (!powerSyncSystem.isInitialized) {
    return;
  }

  try {
    const projects = await powerSyncSystem.getAll(
      `SELECT id, created_by FROM projects WHERE deleted_at IS NULL`
    );

    const invalidProjects = projects.filter(
      (p: { id: string; created_by: string | null }) =>
        p.created_by !== null && p.created_by !== userId
    );

    if (invalidProjects.length > 0) {
      logger.warn(
        'Projects with invalid created_by found (will be skipped on sync):',
        invalidProjects
      );
    }
  } catch (error) {
    logger.error('Failed to validate projects for sync:', error);
    // Non-fatal: continue even if validation fails
  }
}

/**
 * Connect PowerSync after sign-in, with error handling
 * Non-blocking: failures are logged but don't prevent sign-in
 */
async function connectPowerSyncAfterSignIn(): Promise<void> {
  if (!powerSyncSystem.isInitialized) {
    logger.warn('PowerSync not initialized, skipping connection after sign-in');
    return;
  }

  if (powerSyncSystem.isConnected) {
    logger.info('PowerSync already connected, skipping connection');
    return;
  }

  try {
    await powerSyncSystem.connect();
    logger.info('PowerSync connected after sign-in');
  } catch (error) {
    logger.error('Failed to connect PowerSync after sign-in:', error);
    // Non-fatal: user can still use app offline
  }
}

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
              async (event: AuthChangeEvent, session: Session | null) => {
                logger.info(
                  `Auth state changed: ${event}`,
                  session?.user?.email
                );
                set({
                  session,
                  user: session?.user ?? null,
                });

                // Handle SIGNED_IN event: update projects and connect PowerSync
                if (event === 'SIGNED_IN' && session?.user) {
                  const userId = session.user.id;
                  await updateProjectsWithUserId(userId);
                  await validateProjectsForSync(userId);
                  await connectPowerSyncAfterSignIn();
                }
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

            // Update projects with user_id, validate, and connect PowerSync
            if (data.user) {
              const userId = data.user.id;
              await updateProjectsWithUserId(userId);
              await validateProjectsForSync(userId);
              await connectPowerSyncAfterSignIn();
            }
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
