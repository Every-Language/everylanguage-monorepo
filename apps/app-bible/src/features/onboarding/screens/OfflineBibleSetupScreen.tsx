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

// Logging configuration for this module
const ENABLE_LOGGING = false;

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
