import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { View, Text, StyleSheet, StatusBar, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { PowerSyncContext } from '@powersync/react';
import { AbstractPowerSyncDatabase } from '@powersync/react-native';
import { powerSyncSystem } from '@/shared/infrastructure/powersync/services/PowerSyncSystem';
import { useAuthStore } from '@/shared/auth/store/authStore';
import { logger } from '@/shared/utils/logger';
import { ErrorBoundary, LoadingScreen } from '@/shared/ui';
import { useThemeStore } from '@/shared/store/themeStore';
import { useTheme, useSupabaseAppState } from '@/shared/hooks';
import { appInitializationService } from '@/shared/services/AppInitializationService';
import { BRAND_COLORS } from '@/shared/constants/theme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Configure splash screen animation
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

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
  const [appIsReady, setAppIsReady] = useState(false);
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
        setAppIsReady(true);
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error('Unknown initialization error');
        logger.error('Failed during app initialization:', err);
        setInitError(err);
        setPowerSyncError(err);
        setIsInitializing(false);
        setAppIsReady(true); // Still mark as ready to show error screen
      }
    };

    initializeApp();
  }, []);

  // Hide splash screen once app is ready and layout is complete
  const onLayoutRootView = useCallback(() => {
    if (appIsReady) {
      // Hide splash screen once we know the root view has performed layout
      SplashScreen.hideAsync().catch(error => {
        logger.warn('Failed to hide splash screen:', error);
      });
    }
  }, [appIsReady]);

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
          <View
            style={[
              styles.errorContainer,
              {
                backgroundColor:
                  theme?.colors?.background || BRAND_COLORS.CREAM,
              },
            ]}
            onLayout={onLayoutRootView}>
            <Text
              style={[
                styles.errorTitle,
                {
                  color: theme?.colors?.text || BRAND_COLORS.ALMOST_BLACK,
                },
              ]}>
              {powerSyncError ? 'PowerSync Error' : 'Initialization Error'}
            </Text>
            <Text
              style={[
                styles.errorText,
                {
                  color: theme?.colors?.textSecondary || '#666666',
                },
              ]}>
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
          <View style={styles.loadingContainer} onLayout={onLayoutRootView}>
            <LoadingScreen
              message={isInitializing ? 'Initializing...' : 'Loading...'}
            />
          </View>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <PowerSyncContext.Provider value={powerSync as AbstractPowerSyncDatabase}>
        <SafeAreaProvider>
          <View style={styles.rootContainer} onLayout={onLayoutRootView}>
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
              <Stack.Screen
                name='modals/create-project'
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name='modals/edit-project'
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name='modals/create-sequence'
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
            </Stack>
          </View>
        </SafeAreaProvider>
      </PowerSyncContext.Provider>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default RootLayout;
