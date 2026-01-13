import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PowerSyncContext } from '@powersync/react';
import { AbstractPowerSyncDatabase } from '@powersync/react-native';
import { powerSyncSystem } from '@/shared/infrastructure/powersync/services/PowerSyncSystem';
import { useAuthStore } from '@/shared/auth/store/authStore';
import { logger } from '@/shared/utils/logger';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { useThemeStore } from '@/shared/store/themeStore';
import { useTheme, useSupabaseAppState } from '@/shared/hooks';
import { appInitializationService } from '@/shared/services/AppInitializationService';

/**
 * Root Layout for Expo Router
 *
 * Provides PowerSync context and handles app initialization.
 * Uses native screen transitions with iOS-style animations.
 */
const StatusBarWrapper: React.FC = () => {
  const { mode } = useTheme();
  const systemScheme = useThemeStore(state => state.systemScheme);

  // Handle system mode by checking the effective theme mode
  const effectiveMode = mode === 'system' ? systemScheme : mode;
  const barStyle = effectiveMode === 'dark' ? 'light-content' : 'dark-content';

  return (
    <StatusBar
      barStyle={barStyle}
      backgroundColor={Platform.OS === 'android' ? 'transparent' : undefined}
      translucent={Platform.OS === 'android'}
    />
  );
};

const RootLayout: React.FC = () => {
  const [powerSyncReady, setPowerSyncReady] = useState(false);
  const [powerSyncError, setPowerSyncError] = useState<Error | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<Error | null>(null);
  const { user, isInitialized } = useAuthStore();
  const initializationRef = useRef(false);
  // Call useTheme at the top level - hooks must be called unconditionally
  const { theme } = useTheme();

  // Manage Supabase auth token refresh based on AppState
  useSupabaseAppState();

  // Initialize app using centralized service
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initializeApp = async () => {
      try {
        // Use centralized initialization service
        // This handles PowerSync, stores (theme, i18n, localization), and auth
        await appInitializationService.initializeApp();

        // Check PowerSync status for UI state
        setPowerSyncReady(powerSyncSystem.isInitialized);

        setIsInitializing(false);
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error('Unknown initialization error');
        logger.error('Failed during app initialization:', err);
        setInitError(err);
        setPowerSyncError(err);
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  // Connect PowerSync when user logs in
  useEffect(() => {
    if (!isInitialized || !user || isInitializing) {
      if (isInitialized && !user && powerSyncSystem.isConnected) {
        powerSyncSystem.disconnect().catch(error => {
          logger.warn('Failed to disconnect PowerSync on sign out:', error);
        });
      }
      return;
    }

    let cancelled = false;

    const connectPowerSync = async () => {
      try {
        logger.info('Connecting PowerSync...');
        await powerSyncSystem.connect();
        if (!cancelled) {
          logger.info('PowerSync connected successfully');
        }
      } catch (error) {
        if (!cancelled) {
          const err =
            error instanceof Error
              ? error
              : new Error('PowerSync connection failed');
          logger.error('PowerSync connection failed:', err);
        }
      }
    };

    connectPowerSync();

    return () => {
      cancelled = true;
    };
  }, [user, isInitialized, isInitializing]);

  // PowerSync instance for context provider
  const powerSync = useMemo(() => {
    if (!powerSyncReady || !powerSyncSystem.isInitialized) {
      return null;
    }
    try {
      return powerSyncSystem.database;
    } catch (error) {
      logger.error('Failed to access PowerSync database:', error);
      return null;
    }
  }, [powerSyncReady]);

  // Show loading/error states
  if (powerSyncError || initError) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>
              {powerSyncError ? 'PowerSync Error' : 'Initialization Error'}
            </Text>
            <Text style={styles.errorText}>
              {(powerSyncError || initError)?.message}
            </Text>
          </View>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  if (!powerSyncReady || !powerSync || isInitializing) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size='large' />
            <Text style={styles.loadingText}>
              {isInitializing ? 'Loading...' : 'Initializing...'}
            </Text>
          </View>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <PowerSyncContext.Provider value={powerSync as AbstractPowerSyncDatabase}>
        <SafeAreaProvider>
          <StatusBarWrapper />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'default',
              contentStyle: {
                backgroundColor: theme?.colors?.background || '#ebe5d9',
              },
            }}>
            <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </PowerSyncContext.Provider>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ebe5d9', // Default cream background
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#070707', // Default dark text
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ebe5d9', // Default cream background
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#070707', // Default dark text
  },
  errorText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
});

export default RootLayout;
