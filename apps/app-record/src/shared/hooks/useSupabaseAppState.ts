import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from '@/shared/infrastructure/supabase/client';
import { logger } from '@/shared/utils/logger';

/**
 * Hook to manage Supabase auth token refresh based on AppState
 *
 * Automatically starts/stops token refresh when app comes to foreground/background.
 * Properly cleans up listener on unmount to prevent memory leaks.
 */
export const useSupabaseAppState = (): void => {
  useEffect(() => {
    let subscription: ReturnType<typeof AppState.addEventListener> | null =
      null;

    const handleAppStateChange = (nextAppState: AppStateStatus): void => {
      if (nextAppState === 'active') {
        supabase.auth.startAutoRefresh();
        logger.debug('Supabase auth auto-refresh started');
      } else {
        supabase.auth.stopAutoRefresh();
        logger.debug('Supabase auth auto-refresh stopped');
      }
    };

    // Set initial state
    if (AppState.currentState === 'active') {
      supabase.auth.startAutoRefresh();
    }

    // Subscribe to AppState changes
    subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup listener on unmount
    return () => {
      if (subscription) {
        subscription.remove();
        subscription = null;
      }
      // Stop refresh on cleanup
      supabase.auth.stopAutoRefresh();
    };
  }, []);
};
