import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';

// Logging configuration for this module
const ENABLE_LOGGING = false;

import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';
import * as DocumentPicker from 'expo-document-picker';
import { ImportService } from '../services/ImportService';
import { logger } from '@/shared/utils/logger';

export const ImportBiblePackageModal: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { theme } = useTheme();

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    uri: string;
  } | null>(null);

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.getParent()?.goBack();
    }
  }, [navigation]);

  const handleSelectFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.everylanguage.elpkg',
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      const fileName = asset.name || '';
      if (!fileName.toLowerCase().endsWith('.elpkg')) {
        Alert.alert(
          'Unsupported File Type',
          'Please select a valid .elpkg file.'
        );
        return;
      }

      setSelectedFile({
        name: fileName,
        uri: asset.uri,
      });
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'ImportBiblePackageModal: file selection failed',
        error
      );
      Alert.alert(
        'File Selection Failed',
        'There was an error selecting the file. Please try again.'
      );
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setImportProgress('Reading package...');

    try {
      // Preview the package first
      setImportProgress('Validating package...');
      const manifest = await ImportService.previewPackage(selectedFile.uri);

      // Import the package
      setImportProgress('Importing package...');
      await ImportService.importPackage(selectedFile.uri);

      setImportProgress('Import completed!');

      // Show success message
      Alert.alert(
        'Import Successful',
        `Successfully imported ${manifest.kind} package.`,
        [
          {
            text: 'OK',
            onPress: handleClose,
          },
        ]
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'ImportBiblePackageModal: import failed',
        error
      );
      setImportProgress('Import failed');

      Alert.alert(
        'Import Failed',
        `Failed to import package: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setImportProgress('');
              setIsImporting(false);
            },
          },
        ]
      );
    } finally {
      // Don't reset state here if we're closing due to success
      if (importProgress !== 'Import completed!') {
        setIsImporting(false);
        setImportProgress('');
      }
    }
  }, [selectedFile, handleClose, importProgress]);

  const canImport = selectedFile && !isImporting;

  return (
    <>
      {/* Header - Fixed header for FormSheet compliance */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.modalBackground,
            borderBottomColor: theme.colors.border,
          },
        ]}
        collapsable={false}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Import bible package
          </Text>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.closeButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons
              name='close'
              size={24}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Select a .elpkg file to import
        </Text>
      </View>

      {/* Content - Single child for FormSheet compliance */}
      <View
        style={[
          styles.content,
          { backgroundColor: theme.colors.modalBackground },
        ]}>
        {/* File Selection */}
        <Pressable
          style={[
            styles.selectButton,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
          ]}
          onPress={handleSelectFile}
          disabled={isImporting}>
          <Ionicons name='folder-open' size={24} color={theme.colors.primary} />
          <Text style={[styles.selectButtonText, { color: theme.colors.text }]}>
            {selectedFile ? 'Change file' : 'Select .elpkg file'}
          </Text>
        </Pressable>

        {/* Selected File Display */}
        {selectedFile && (
          <View
            style={[
              styles.selectedFileContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}>
            <Ionicons name='document' size={20} color={theme.colors.primary} />
            <View style={styles.fileInfo}>
              <Text style={[styles.fileName, { color: theme.colors.text }]}>
                {selectedFile.name}
              </Text>
              <Text
                style={[
                  styles.fileType,
                  { color: theme.colors.textSecondary },
                ]}>
                Bible Package File
              </Text>
            </View>
            <Ionicons
              name='checkmark-circle'
              size={20}
              color={theme.colors.success || theme.colors.primary}
            />
          </View>
        )}

        {/* Progress Display */}
        {isImporting && importProgress && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size='small' color={theme.colors.primary} />
            <Text
              style={[styles.progressText, { color: theme.colors.primary }]}>
              {importProgress}
            </Text>
          </View>
        )}

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Import Button */}
        <Pressable
          style={[
            styles.importButton,
            {
              backgroundColor: canImport
                ? theme.colors.primary
                : theme.colors.interactiveDisabled,
            },
          ]}
          onPress={handleImport}
          disabled={!canImport}>
          <Text
            style={[
              styles.importButtonText,
              { color: theme.colors.textInverse },
            ]}>
            {isImporting ? 'Importing...' : 'Import Package'}
          </Text>
        </Pressable>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    borderRadius: 16,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileType: {
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
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
