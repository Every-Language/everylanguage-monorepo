import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import type {
  LanguageInfoScreenProps,
  VersionSelectionStackNavigationProp,
} from '../navigation/VersionSelectionStackNavigator';
import type { AudioVersion, TextVersion } from '../types/entities';
import { fuzzySearchService } from '../services/fuzzySearchService';
import { ModalHeader } from '@everylanguage/shared-native-ui';
import { useVersionsStore } from '../store/versionsStore';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export const LanguageInfoScreen: React.FC<LanguageInfoScreenProps> = ({
  route,
}) => {
  const { versionType, languageResult } = route.params;
  const { theme } = useTheme();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<VersionSelectionStackNavigationProp>();
  const [isSaving, setIsSaving] = useState(false);

  const versions: (AudioVersion | TextVersion)[] = useMemo(() => {
    const converted =
      fuzzySearchService.convertVersionsToInternalFormat(languageResult);
    return versionType === 'audio' ? converted.audio : converted.text;
  }, [languageResult, versionType]);

  const {
    addSavedVersion,
    setCurrentAudioVersion,
    setCurrentTextVersion,
    isVersionSaved,
  } = useVersionsStore();

  const regionText = useMemo(() => {
    try {
      const regions =
        (languageResult.regions as unknown as Array<{
          region_name?: string;
        }>) || [];
      return regions[0]?.region_name || '';
    } catch {
      return '';
    }
  }, [languageResult]);
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSelectVersion = useCallback(
    async (version: AudioVersion | TextVersion) => {
      if (isSaving) return;
      setIsSaving(true);
      try {
        const overallStart = Date.now();
        logger.info(ENABLE_LOGGING, '[Versions] Saving selection start', {
          screen: 'LanguageInfo',
          versionType,
          versionId: version.id,
        });
        const alreadySaved = isVersionSaved(version.id, versionType);
        if (!alreadySaved) {
          const t0 = Date.now();
          logger.info(ENABLE_LOGGING, '[Versions] addSavedVersion begin', {
            versionType,
            versionId: version.id,
          });
          await addSavedVersion(version, versionType);
          logger.info(ENABLE_LOGGING, '[Versions] addSavedVersion done', {
            durationMs: Date.now() - t0,
          });
        }
        if (versionType === 'audio') {
          const t1 = Date.now();
          logger.info(
            ENABLE_LOGGING,
            '[Versions] setCurrentAudioVersion begin',
            {
              versionId: version.id,
            }
          );
          await setCurrentAudioVersion(version as AudioVersion);
          logger.info(
            ENABLE_LOGGING,
            '[Versions] setCurrentAudioVersion done',
            {
              durationMs: Date.now() - t1,
            }
          );
        } else {
          const t2 = Date.now();
          logger.info(
            ENABLE_LOGGING,
            '[Versions] setCurrentTextVersion begin',
            {
              versionId: version.id,
            }
          );
          await setCurrentTextVersion(version as TextVersion);
          logger.info(ENABLE_LOGGING, '[Versions] setCurrentTextVersion done', {
            durationMs: Date.now() - t2,
          });
        }
        navigation.getParent()?.goBack();
        logger.info(ENABLE_LOGGING, '[Versions] Modal closed after save', {
          totalMs: Date.now() - overallStart,
        });
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          '[Versions] LanguageInfo: select version failed',
          error
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      addSavedVersion,
      isVersionSaved,
      navigation,
      setCurrentAudioVersion,
      setCurrentTextVersion,
      versionType,
      isSaving,
    ]
  );

  const navigateToVersionInfo = useCallback(
    (version: AudioVersion | TextVersion) => {
      navigation.navigate('VersionInfo', { versionType, version });
    },
    [navigation, versionType]
  );

  const menuActions: MenuAction[] = useMemo(
    () => [
      { id: 'info', title: t('versions.infoTitle'), image: 'info.circle' },
    ],
    [t]
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.modalBackground,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}>
      <ModalHeader
        title={t('languages.infoTitle', { defaultValue: 'Language info' })}
        showBack
        onBack={handleBack}
        showClose
        onClose={() => navigation.getParent()?.goBack()}
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.body}>
          <View style={styles.headerBlock}>
            <Text
              style={[styles.title, { color: theme.colors.text }]}
              numberOfLines={2}>
              {languageResult.entity_name}
            </Text>
            {!!regionText && (
              <Text
                style={[styles.subtitle, { color: theme.colors.textSecondary }]}
                numberOfLines={1}>
                {regionText}
              </Text>
            )}
          </View>

          {/* Versions list */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('versions.available', { versionType })}
            </Text>
            {versions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size='small' color={theme.colors.primary} />
              </View>
            ) : (
              <View>
                {versions.map(v => {
                  const saved = isVersionSaved(v.id, versionType);
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.versionRow,
                        { backgroundColor: theme.colors.surface },
                      ]}
                      onPress={() => handleSelectVersion(v)}
                      disabled={isSaving}>
                      <View style={styles.versionRowInfo}>
                        <Text
                          style={[
                            styles.versionRowName,
                            { color: theme.colors.text },
                          ]}>
                          {v.name}
                        </Text>
                        {saved && (
                          <View style={styles.versionRowBadge}>
                            <Ionicons
                              name='checkmark-circle'
                              size={16}
                              color={theme.colors.primary}
                            />
                            <Text
                              style={[
                                styles.versionRowBadgeText,
                                { color: theme.colors.primary },
                              ]}>
                              {t('versions.savedBadge')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.rowActions}>
                        <MenuView
                          actions={menuActions}
                          onPressAction={({ nativeEvent }) => {
                            if (nativeEvent.event === 'info')
                              navigateToVersionInfo(v);
                          }}>
                          <TouchableOpacity
                            onPress={() => {}}
                            style={styles.menuButtonArea}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons
                              name='ellipsis-horizontal'
                              size={18}
                              color={theme.colors.textSecondary}
                            />
                          </TouchableOpacity>
                        </MenuView>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      {isSaving && (
        <View
          style={[
            styles.savingOverlay,
            { backgroundColor: theme.colors.surfaceOverlay },
          ]}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text style={[styles.savingText, { color: theme.colors.text }]}>
            {t('common.saving')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  body: {
    padding: 16,
    paddingBottom: 100,
  },
  headerBlock: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  versionRow: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  versionRowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionRowName: {
    fontSize: 14,
    fontWeight: '500',
  },
  versionRowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  versionRowBadgeText: {
    fontSize: 12,
    marginLeft: 4,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButtonArea: {
    marginLeft: 8,
    padding: 8,
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
});
