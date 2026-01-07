import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  AppState,
  InteractionManager,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { SystemBars } from 'react-native-edge-to-edge';
import { useTheme, useThemeStore } from '@everylanguage/shared-native-ui';
import { useLocalization } from '@/shared/hooks';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { useAuthStore } from '@/shared/store/authStore';
import { useLocalizationStore } from '@/shared/store/localizationStore';
import { permissionsService } from '@/features/permissions/services/PermissionsService';
import { powerSyncSystem } from '@/shared/services/powersync';
import { authService } from '@/features/auth';
import { powerSyncConnectionManager } from '@/shared/services/powersync';
import { appInitializationService } from '@/shared/services/AppInitializationService';
import { RootNavigator } from './navigation/RootNavigator';
import { logger } from '@/shared/utils/logger';
import { queryClient } from '@/shared/services/query/queryClient';
import { UserVersionSelectionWrapper } from '@/features/auth/components/UserVersionSelectionWrapper';
import { initializeVersionsStore } from '@/features/languages/store/versionsStore';
import {
  downloadManager,
  imageDownloadManager,
} from '@/features/downloads/services';
import { ShareService } from '@/features/sharing/services/ShareService';
import { DeepLinkState } from '@/shared/services/deeplink/DeepLinkState';
import { Toast } from '@everylanguage/shared-native-ui';
import { useSearchInitialization } from '@/features/search/hooks';

// Logging configuration for this module
const ENABLE_LOGGING = false;
// Media player service is now handled by AppInitializationService

const StatusBarWrapper: React.FC = () => {
  const { mode } = useTheme();
  const systemScheme = useThemeStore(state => state.systemScheme);

  // Handle system mode by checking the effective theme mode
  const effectiveMode = mode === 'system' ? systemScheme : mode;
  const systemBarsStyle = effectiveMode === 'dark' ? 'light' : 'dark';

  return <SystemBars style={systemBarsStyle} />;
};

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { isLoading: isOnboardingLoading } = useOnboardingStore();
  // Access auth store to ensure it initializes, but don't block UI on it here
  useAuthStore();
  const { isLoading: isLocalizationLoading } = useLocalizationStore();
  const { isLoading: isThemeLoading } = useThemeStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isMediaPlayerReady, setIsMediaPlayerReady] = useState(false);
  const [, setPermissionsGranted] = useState(false);

  // Initialize search indexes
  useSearchInitialization();

  // Initialize core stores + DB quickly, then background heavy tasks
  useEffect(() => {
    let cancelled = false;

    const initializeApp = async () => {
      try {
        setIsInitializing(true);

        // Use the centralized app initialization service
        await appInitializationService.initializeApp();

        // Set media player ready flag (handled by the service)
        setIsMediaPlayerReady(true);
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          'Failed during app initialization:',
          error
        );
        // Set media player ready even if initialization fails to prevent blocking UI
        setIsMediaPlayerReady(true);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }

      // Background heavy work after first paint/interactions
      InteractionManager.runAfterInteractions(() => {
        (async () => {
          // One-time offline bootstrap: auto-import any .elpkg from Documents/import
          try {
            const { documentDirectory } = await import('expo-file-system');
            if (documentDirectory) {
              const FileSystem: typeof import('expo-file-system') =
                await import('expo-file-system');
              const importDir = `${documentDirectory}import/`;
              // Ensure meta table exists and check flag
              try {
                await powerSyncSystem.execute(
                  'CREATE TABLE IF NOT EXISTS __meta (__key TEXT PRIMARY KEY, __value TEXT)'
                );
                let already = false;
                try {
                  const row = await powerSyncSystem.get(
                    "SELECT __value FROM __meta WHERE __key = 'offline_bootstrap_v1'"
                  );
                  already = Boolean(row?.__value);
                } catch {
                  // Some SQLite wrappers throw on empty results; treat as not set
                  already = false;
                }
                if (!already) {
                  const dirInfo = await FileSystem.getInfoAsync(importDir);
                  if (dirInfo.exists) {
                    const entries: string[] =
                      await FileSystem.readDirectoryAsync(importDir);
                    for (const name of entries) {
                      if (name.toLowerCase().endsWith('.elpkg')) {
                        const pkgUri = `${importDir}${name}`;
                        try {
                          const { ImportService } =
                            await import('@/features/sharing/services/ImportService');
                          await ImportService.importPackage(pkgUri);
                        } catch (e) {
                          logger.warn(
                            ENABLE_LOGGING,
                            'Bootstrap import failed for',
                            name,
                            e
                          );
                        }
                      }
                    }
                  }
                  await powerSyncSystem.execute(
                    "INSERT OR REPLACE INTO __meta (__key, __value) VALUES ('offline_bootstrap_v1', ?)",
                    [new Date().toISOString()]
                  );
                }
              } catch (e) {
                logger.warn(
                  ENABLE_LOGGING,
                  'Offline bootstrap failed (non-fatal)',
                  e
                );
              }
            }
          } catch (e) {
            logger.warn(ENABLE_LOGGING, 'Offline bootstrap init error', e);
          }

          // Warm up network store in background (non-blocking)
          try {
            const { useNetworkStore } = await import('@/shared/store');
            // Fire-and-forget network capability checks
            void useNetworkStore.getState().initialize();
          } catch (e) {
            logger.warn(
              ENABLE_LOGGING,
              'Network store background init failed',
              e
            );
          }

          // Ensure we have a session if online (anonymous allowed). Auth is the sole owner
          try {
            await authService.ensureSessionIfOnline();
          } catch (e) {
            logger.warn(
              ENABLE_LOGGING,
              'Auth ensureSessionIfOnline failed (non-fatal):',
              e
            );
          }
          // Analytics (non-blocking)
          try {
            const { AnalyticsService } = await import('@/features/analytics');
            await AnalyticsService.initialize();
            void AnalyticsService.recordAppInstallOnce();
            void AnalyticsService.recordSessionStart();
          } catch (e) {
            logger.warn(
              ENABLE_LOGGING,
              'Analytics early init failed (non-fatal):',
              e
            );
          }

          // Media player already initialized in main flow, skip background init

          // Connect PowerSync (via connection manager; do not block UI)
          try {
            await powerSyncConnectionManager.initialize();
          } catch (connectError) {
            logger.error(
              ENABLE_LOGGING,
              'PowerSync connection manager init failed (continuing offline):',
              connectError
            );
          }

          try {
            await initializeVersionsStore();
          } catch (e) {
            logger.warn(
              ENABLE_LOGGING,
              'Versions store init failed (non-fatal)',
              e
            );
          }

          try {
            await downloadManager.initialize();
            await imageDownloadManager.initialize();
          } catch (e) {
            logger.warn(ENABLE_LOGGING, 'Download managers init failed', e);
          }

          // Try enriching analytics rows with location after services and permissions
          try {
            const { AnalyticsService } = await import('@/features/analytics');
            await AnalyticsService.attemptLocationEnrichment();
          } catch (e) {
            logger.warn(
              ENABLE_LOGGING,
              'Analytics location enrichment failed',
              e
            );
          }

          // Background permissions check (non-blocking)
          try {
            await permissionsService.checkAllPermissions();
            setPermissionsGranted(
              permissionsService.areCriticalPermissionsGranted()
            );
          } catch (e) {
            logger.warn(ENABLE_LOGGING, 'Permissions check failed', e);
          }
        })();
      });
    };

    initializeApp();

    return () => {
      cancelled = true;
    };
  }, []);

  // Lifecycle-based session start/end
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async nextState => {
        try {
          const { AnalyticsService } = await import('@/features/analytics');
          if (nextState === 'background') {
            await AnalyticsService.endCurrentSession();
          } else if (nextState === 'active') {
            await AnalyticsService.recordSessionStart();
          }
        } catch {
          // ignore
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Show loading screen while initializing
  if (
    isInitializing ||
    !isMediaPlayerReady ||
    isOnboardingLoading ||
    isLocalizationLoading ||
    isThemeLoading
  ) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}>
        <ActivityIndicator size='large' color={theme.colors.primary} />
        <Text
          style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  // Create deep linking configuration
  const linking: Parameters<typeof NavigationContainer>[0]['linking'] = {
    prefixes: [
      Linking.createURL('/'),
      'everylanguage://',
      'https://bible.everylanguage.com',
    ],
    config: {
      screens: {
        Home: {
          screens: {
            Bible: {
              screens: {
                BibleRoot: {
                  screens: {
                    BibleBooks: 'home',
                    // Book links → Chapters screen
                    BibleChapters: 'book/:bookId',
                    // Chapter links → Verses screen (chapter-level view)
                    BibleVersesChapter: 'chapter/:chapterId',
                    // Verse links → Verses screen (verse targeted)
                    BibleVerses: 'verse/:verseId',
                  },
                },
              },
            },
          },
        },
        Onboarding: 'onboarding',
        MenuModal: 'menu',
        AuthModal: 'auth',
        VersionSelectionModal: 'versions',
        DownloadStatusModal: 'downloads',
        ExportBiblePackageModal: 'export',
        ImportBiblePackageModal: 'import',
      },
    },

    // Custom URL handling for share tracking
    async getInitialURL() {
      const url = await Linking.getInitialURL();
      if (url) {
        logger.info(ENABLE_LOGGING, '[DeepLink] getInitialURL', url);
        // Track share opens for cold starts without blocking navigation init
        void handleDeepLinkTracking(url);
      }
      return url;
    },

    subscribe(listener: (url: string) => void) {
      const subscription = Linking.addEventListener('url', ({ url }) => {
        logger.info(ENABLE_LOGGING, '[DeepLink] subscribe(url)', url);
        // Track share opens for warm starts
        handleDeepLinkTracking(url);
        listener(url);
      });

      return () => subscription?.remove?.();
    },
  };

  const handleDeepLinkTracking = async (url: string) => {
    try {
      const shareData = ShareService.parseShareUrl(url);
      if (shareData?.shareId) {
        await ShareService.trackShareOpen(powerSyncSystem, shareData.shareId);
      }
      if (shareData) {
        logger.info(ENABLE_LOGGING, '[DeepLink] Parsed URL', shareData);
        DeepLinkState.set({
          type: shareData.type,
          entityId: shareData.entityId,
          shareId: shareData.shareId,
          ...(shareData.shareType ? { shareType: shareData.shareType } : {}),
        });
        logger.info(ENABLE_LOGGING, '[DeepLink] Stored in DeepLinkState');
      }
    } catch (error) {
      logger.warn(ENABLE_LOGGING, 'Failed to track deep link:', error);
    }
  };

  // Show app with integrated onboarding/main flow
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBarWrapper />
          <NavigationContainer
            linking={linking}
            fallback={
              <View
                style={[
                  styles.loadingContainer,
                  { backgroundColor: theme.colors.background },
                ]}>
                <ActivityIndicator size='large' color={theme.colors.primary} />
                <Text
                  style={[
                    styles.loadingText,
                    { color: theme.colors.textSecondary },
                  ]}>
                  {t('common.loading')}
                </Text>
              </View>
            }>
            <RootNavigator />
            <UserVersionSelectionWrapper />
            <Toast />
          </NavigationContainer>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default App;
