import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';
import { usePackageEstimate } from '../hooks/usePackageEstimate';
import { PackagingService } from '../services/PackagingService';
import { useSharing } from '../hooks/useSharing';

type Params = {
  versionType: 'audio' | 'text';
  versionId: string;
  versionName: string;
};

export const ExportVersionModal: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute();
  const { versionType, versionId, versionName } = (route.params ||
    {}) as Params;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLocalization();

  const scope = useMemo(() => ({ mode: 'full' as const }), []);
  const { estimate, loading } = usePackageEstimate(
    versionType,
    versionId,
    scope
  );
  const { shareFile } = useSharing();

  const [isExporting, setIsExporting] = useState(false);
  const [progressText, setProgressText] = useState('');

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.getParent()?.goBack();
  }, [navigation]);

  const handleExport = useCallback(async () => {
    if (!versionId) return;
    try {
      setIsExporting(true);
      setProgressText(
        versionType === 'audio'
          ? t('sharing.creatingAudioPackage')
          : t('sharing.creatingTextPackage')
      );
      if (versionType === 'audio') {
        const { packageUris } = await PackagingService.createAudioPackage(
          versionId,
          scope
        );
        setProgressText(t('sharing.openingShareSheet'));
        for (const uri of packageUris) {
          await shareFile(uri);
        }
      } else {
        const { packageUris } = await PackagingService.createTextPackage(
          versionId,
          scope
        );
        setProgressText(t('sharing.openingShareSheet'));
        for (const uri of packageUris) {
          await shareFile(uri);
        }
      }
      handleClose();
    } finally {
      setIsExporting(false);
      setProgressText('');
    }
  }, [versionId, versionType, scope, shareFile, handleClose, t]);

  const formatSize = (bytes: number | undefined) => {
    if (!bytes) return '';
    const mb = Math.round(bytes / (1024 * 1024));
    return mb > 0 ? t('common.megabytes', { mb }) : t('common.lessThanOneMB');
  };

  return (
    <>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.modalBackground,
            paddingBottom: Math.max(insets.bottom, 0),
            borderBottomColor: theme.colors.border,
          },
        ]}
        collapsable={false}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('nav.exportVersion')}
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
          {versionName}
        </Text>
      </View>

      {/* Body */}
      <View
        style={[
          styles.body,
          { backgroundColor: theme.colors.modalBackground },
        ]}>
        <Text style={[styles.explain, { color: theme.colors.textSecondary }]}>
          {versionType === 'audio'
            ? t('sharing.exportAudioDescription')
            : t('sharing.exportTextDescription')}
        </Text>
        <View style={[styles.sizeRow, { borderColor: theme.colors.border }]}>
          {loading ? (
            <ActivityIndicator size='small' color={theme.colors.primary} />
          ) : (
            <Text style={[styles.sizeText, { color: theme.colors.text }]}>
              {t('common.size')}: {formatSize(estimate?.totalBytes)}
            </Text>
          )}
          {!!estimate?.partCount && estimate.partCount > 1 && (
            <Text
              style={[styles.partText, { color: theme.colors.textSecondary }]}>
              {t('sharing.parts', { count: estimate.partCount })}
            </Text>
          )}
          {!!progressText && (
            <Text
              style={[styles.progressText, { color: theme.colors.primary }]}>
              {progressText}
            </Text>
          )}
        </View>
      </View>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { backgroundColor: theme.colors.modalBackground },
        ]}>
        <Pressable
          style={[
            styles.exportButton,
            {
              backgroundColor: isExporting
                ? theme.colors.interactiveDisabled
                : theme.colors.primary,
            },
          ]}
          onPress={handleExport}
          disabled={isExporting}>
          <Text
            style={[
              styles.exportButtonText,
              { color: theme.colors.textInverse },
            ]}>
            {isExporting ? t('sharing.exporting') : t('sharing.export')}
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
    marginBottom: 8,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flex: 1,
  },
  explain: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  sizeRow: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sizeText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  partText: {
    fontSize: 12,
  },
  progressText: {
    fontSize: 12,
    marginTop: 6,
  },
  footer: {
    padding: 20,
  },
  exportButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
