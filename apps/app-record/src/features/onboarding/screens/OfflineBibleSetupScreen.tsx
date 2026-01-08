import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme, useLocalization } from '@/shared/hooks';
import { logger } from '@/shared/utils/logger';
import * as DocumentPicker from 'expo-document-picker';
import { ImportService } from '@/features/sharing/services/ImportService';
import { OnboardingHeader } from '../components';
import { usePowerSyncStatus } from '../hooks/usePowerSyncStatus';
import { usePowerSyncTables } from '../hooks/usePowerSyncTables';

// Logging configuration for this module
const ENABLE_LOGGING = true;

interface OfflineBibleSetupScreenProps {
  onBack: () => void;
  onComplete: () => void;
}

// TODO: Restrict accepted file types to custom .bible binary when format is finalized

export const OfflineBibleSetupScreen: React.FC<
  OfflineBibleSetupScreenProps
> = ({ onBack, onComplete }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const syncStatus = usePowerSyncStatus();
  const { tables: syncedTables, loading: tablesLoading } = usePowerSyncTables();
  const [pickedFiles, setPickedFiles] = useState<
    Array<{ name: string; uri: string }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');

  const handlePickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
        type: 'application/vnd.everylanguage.elpkg',
      });
      if (result.canceled) return;

      const validFiles: Array<{ name: string; uri: string }> = [];
      const invalidFiles: string[] = [];

      for (const asset of result.assets || []) {
        const name = asset.name || '';
        if (name.toLowerCase().endsWith('.elpkg')) {
          validFiles.push({ name, uri: asset.uri });
        } else {
          invalidFiles.push(name);
        }
      }

      if (invalidFiles.length > 0) {
        Alert.alert(
          t('onboarding.offlineSetup.title'),
          t('onboarding.offlineSetup.unsupportedFileType')
        );
      }

      if (validFiles.length > 0) {
        setPickedFiles(validFiles);
      }
    } catch (e) {
      logger.error(
        ENABLE_LOGGING,
        'OfflineBibleSetupScreen: file pick failed',
        e
      );
    }
  };

  const handleImport = async () => {
    if (pickedFiles.length === 0) return;

    try {
      setBusy(true);

      for (let i = 0; i < pickedFiles.length; i++) {
        const file = pickedFiles[i];
        if (!file) continue;

        setImportProgress(t('onboarding.offlineSetup.importing'));

        try {
          await ImportService.importPackage(file.uri);
          logger.info(ENABLE_LOGGING, `Successfully imported: ${file.name}`);
        } catch (error) {
          logger.error(ENABLE_LOGGING, `Failed to import ${file.name}:`, error);
          Alert.alert(
            t('common.error'),
            t('onboarding.offlineSetup.importError', {
              fileName: file.name,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          );
        }
      }

      onComplete();
    } catch (e) {
      logger.error(ENABLE_LOGGING, 'OfflineBibleSetupScreen: import failed', e);
    } finally {
      setBusy(false);
      setImportProgress('');
    }
  };

  const handleDisabledButtonPress = () => {
    Alert.alert(
      t('onboarding.offlineSetup.title'),
      t('onboarding.offlineSetup.selectFilesToContinue')
    );
  };

  const canImport = pickedFiles.length > 0;

  // Get sync status display info
  const getSyncStatusInfo = () => {
    if (!syncStatus.initialized) {
      return {
        icon: 'sync-disabled' as const,
        text: t('onboarding.offlineSetup.syncStatus.notInitialized'),
        color: theme.colors.textSecondary,
      };
    }
    if (syncStatus.connecting) {
      return {
        icon: 'sync' as const,
        text: t('onboarding.offlineSetup.syncStatus.connecting'),
        color: theme.colors.primary,
      };
    }
    if (syncStatus.connected) {
      return {
        icon: 'cloud-done' as const,
        text: t('onboarding.offlineSetup.syncStatus.connected'),
        color: theme.colors.success,
      };
    }
    if (syncStatus.error) {
      return {
        icon: 'error-outline' as const,
        text: t('onboarding.offlineSetup.syncStatus.error', {
          error: syncStatus.error,
        }),
        color: theme.colors.error,
      };
    }
    return {
      icon: 'cloud-off' as const,
      text: t('onboarding.offlineSetup.syncStatus.disconnected'),
      color: theme.colors.textSecondary,
    };
  };

  const syncStatusInfo = getSyncStatusInfo();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OnboardingHeader
        title={t('onboarding.offlineSetup.title')}
        subtitle={t('onboarding.offlineSetup.subtitle')}
        showBackButton={true}
        onBack={onBack}
        showControls={true}
      />

      <ScrollView style={styles.content}>
        {/* PowerSync Status */}
        <View
          style={[
            styles.syncStatusContainer,
            { borderColor: theme.colors.border },
          ]}>
          <View style={styles.syncStatusHeader}>
            <MaterialIcons
              name={syncStatusInfo.icon}
              size={20}
              color={syncStatusInfo.color}
            />
            <Text
              style={[styles.syncStatusTitle, { color: theme.colors.text }]}>
              {t('Power Sync Status')}
            </Text>
          </View>
          <Text
            style={[styles.syncStatusText, { color: syncStatusInfo.color }]}>
            {syncStatusInfo.text}
          </Text>
          {syncStatus.connectionMethod && (
            <Text
              style={[
                styles.syncStatusMethod,
                { color: theme.colors.textSecondary },
              ]}>
              {t('onboarding.offlineSetup.syncStatus.method', {
                method: syncStatus.connectionMethod,
              })}
            </Text>
          )}
        </View>

        {/* Synced Tables */}
        {syncStatus.initialized && (
          <View
            style={[
              styles.tablesContainer,
              { borderColor: theme.colors.border },
            ]}>
            <View style={styles.tablesHeader}>
              <MaterialIcons
                name='storage'
                size={20}
                color={theme.colors.primary}
              />
              <Text style={[styles.tablesTitle, { color: theme.colors.text }]}>
                {t('onboarding.offlineSetup.syncedTables.title', {
                  defaultValue: 'Synced Tables ({{count}})',
                  count: syncedTables.length,
                })}
              </Text>
            </View>
            {tablesLoading ? (
              <Text
                style={[
                  styles.tablesLoading,
                  { color: theme.colors.textSecondary },
                ]}>
                {t('common.loading', { defaultValue: 'Loading...' })}
              </Text>
            ) : syncedTables.length > 0 ? (
              <View style={styles.tablesList}>
                {syncedTables.map((table, index) => (
                  <View
                    key={table.name}
                    style={[
                      styles.tableRow,
                      { borderBottomColor: theme.colors.border },
                      index === syncedTables.length - 1 && styles.tableRowLast,
                    ]}>
                    <View style={styles.tableRowContent}>
                      <MaterialIcons
                        name='table-chart'
                        size={16}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.tableName,
                          { color: theme.colors.text },
                        ]}>
                        {table.name}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.tableCount,
                        { color: theme.colors.textSecondary },
                      ]}>
                      {table.rowCount.toLocaleString()}{' '}
                      {t('onboarding.offlineSetup.syncedTables.rows', {
                        defaultValue: 'rows',
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text
                style={[
                  styles.tablesEmpty,
                  { color: theme.colors.textSecondary },
                ]}>
                {t('onboarding.offlineSetup.syncedTables.empty', {
                  defaultValue: 'No synced tables found',
                })}
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.pickButton, { borderColor: theme.colors.border }]}
          onPress={handlePickFiles}>
          <MaterialIcons
            name='folder-open'
            size={20}
            color={theme.colors.primary}
          />
          <Text style={[styles.pickButtonText, { color: theme.colors.text }]}>
            {t('onboarding.offlineSetup.pickFiles')}
          </Text>
        </TouchableOpacity>

        {pickedFiles.length > 0 && (
          <View style={styles.selectedFilesContainer}>
            <Text
              style={[
                styles.selectedFilesText,
                { color: theme.colors.textSecondary },
              ]}>
              {t('onboarding.offlineSetup.selectedFiles', {
                count: pickedFiles.length,
              })}
            </Text>
            {pickedFiles.map((file, index) => (
              <Text
                key={index}
                style={[styles.fileName, { color: theme.colors.text }]}>
                • {file.name}
              </Text>
            ))}
          </View>
        )}

        {importProgress && (
          <Text style={[styles.progressText, { color: theme.colors.primary }]}>
            {importProgress}
          </Text>
        )}
      </ScrollView>

      {/* Action Button */}
      <View
        style={[styles.footer, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          style={[
            styles.importButton,
            {
              backgroundColor: canImport
                ? theme.colors.primary
                : theme.colors.interactiveDisabled,
            },
          ]}
          onPress={canImport ? handleImport : handleDisabledButtonPress}
          disabled={busy}>
          <Text
            style={[
              styles.importButtonText,
              { color: theme.colors.textInverse },
            ]}>
            {busy
              ? t('onboarding.offlineSetup.importing')
              : t('onboarding.offlineSetup.importPackages')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 120,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
  },
  pickButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedFilesContainer: {
    marginTop: 16,
  },
  selectedFilesText: {
    fontSize: 14,
    marginBottom: 8,
  },
  fileName: {
    fontSize: 14,
    marginLeft: 8,
    marginBottom: 4,
  },
  progressText: {
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  syncStatusContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  syncStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  syncStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  syncStatusText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  syncStatusMethod: {
    fontSize: 12,
    marginTop: 4,
  },
  tablesContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  tablesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tablesTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  tablesLoading: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
  tablesEmpty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
  tablesList: {
    gap: 0,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tableName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  tableCount: {
    fontSize: 12,
    fontWeight: '400',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    padding: 20,
    paddingTop: 12,
  },
  importButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  importButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
