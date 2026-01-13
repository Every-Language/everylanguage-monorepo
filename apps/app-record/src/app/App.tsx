import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PowerSyncContext } from '@powersync/react';
import { AbstractPowerSyncDatabase } from '@powersync/react-native';
import { powerSyncSystem } from '@/shared/infrastructure/powersync/services/PowerSyncSystem';
import { useAuthStore } from '@/shared/auth/store/authStore';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { logger } from '@/shared/utils/logger';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { colors } from '@/shared/constants/colors';

const AppContent: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<Error | null>(null);
  const { user, initialize, isInitialized } = useAuthStore();
  const initializationRef = useRef(false);

  // Initialize auth store once
  // PowerSync is already initialized in App component
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initializeApp = async () => {
      try {
        // Initialize auth store
        logger.info('Initializing auth store...');
        await initialize();
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error('Unknown initialization error');
        logger.error('Failed during app initialization:', err);
        setInitError(err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, [initialize]);

  // Connect PowerSync when user logs in and auth is initialized
  // PowerSync handles retries and reconnection automatically
  useEffect(() => {
    if (!isInitialized || !user || isInitializing) return;

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

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Initialization Error</Text>
        <Text style={styles.errorText}>{initError.message}</Text>
      </View>
    );
  }

  return user ? <HomeScreen /> : <LoginScreen />;
};

const App: React.FC = () => {
  const [powerSyncReady, setPowerSyncReady] = useState(false);
  const [powerSyncError, setPowerSyncError] = useState<Error | null>(null);

  // Initialize PowerSync before providing context
  useEffect(() => {
    const initPowerSync = async () => {
      try {
        await powerSyncSystem.initialize();
        setPowerSyncReady(true);
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error('PowerSync initialization failed');
        logger.error('Failed to initialize PowerSync in App component:', err);
        setPowerSyncError(err);
        setPowerSyncReady(true); // Set ready to show error UI
      }
    };
    initPowerSync();
  }, []);

  // PowerSync instance for context provider
  // Only access database after initialization
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

  // Show error if PowerSync initialization failed
  if (powerSyncError) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>
              PowerSync Initialization Error
            </Text>
            <Text style={styles.errorText}>{powerSyncError.message}</Text>
          </View>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  // Don't render context provider until PowerSync is initialized
  if (!powerSyncReady || !powerSync) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size='large' />
            <Text style={styles.loadingText}>Initializing...</Text>
          </View>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <PowerSyncContext.Provider value={powerSync as AbstractPowerSyncDatabase}>
        <SafeAreaProvider>
          <AppContent />
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
    color: colors.gray,
    textAlign: 'center',
  },
});

export default App;
