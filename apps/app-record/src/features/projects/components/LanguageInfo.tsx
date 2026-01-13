import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useTranslation } from '@/shared/hooks';
import {
  HierarchySection,
  LanguageStatsSection,
} from '@/features/languages/components';
import {
  useLanguageDetails,
  useLanguageHierarchy,
  useLanguageStats,
} from '@/features/languages/hooks';

export interface LanguageInfoProps {
  languageId: string;
  languageName: string;
  type: 'source' | 'target';
  fromView?: boolean;
  onBack: () => void;
  onSelect: (languageId: string, languageName: string) => void;
}

/**
 * Language Info Component
 *
 * Displays detailed information about a selected language including:
 * - Hierarchy (expandable tree with menu to select other languages)
 * - Language statistics (population, regions, people groups)
 * - Bible translation status
 * - Select button to confirm selection
 */
export const LanguageInfo: React.FC<LanguageInfoProps> = ({
  languageId,
  languageName,
  onBack,
  onSelect,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [selectedLanguageId, setSelectedLanguageId] = useState<string>(
    languageId || ''
  );
  const [selectedLanguageName, setSelectedLanguageName] = useState<string>(
    languageName || ''
  );

  const { data: languageDetails, isLoading: detailsLoading } =
    useLanguageDetails(selectedLanguageId);
  const { data: hierarchy, isLoading: hierarchyLoading } =
    useLanguageHierarchy(selectedLanguageId);
  const { data: stats, isLoading: statsLoading } =
    useLanguageStats(selectedLanguageId);

  const handleSelectNode = useCallback(
    (nodeId: string, nodeName: string): void => {
      setSelectedLanguageId(nodeId);
      setSelectedLanguageName(nodeName);
    },
    []
  );

  const handleSelect = useCallback((): void => {
    if (!selectedLanguageId || !selectedLanguageName) return;
    onSelect(selectedLanguageId, selectedLanguageName);
  }, [selectedLanguageId, selectedLanguageName, onSelect]);

  const displayName =
    selectedLanguageName || languageDetails?.name || 'Loading...';
  const isLoading = detailsLoading || hierarchyLoading || statsLoading;

  return (
    <SafeAreaView
      {...(Platform.OS === 'ios'
        ? { edges: ['bottom', 'left', 'right'] as const }
        : {})}
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.accent }]}
          onPress={onBack}
          accessibilityLabel={t('common.back')}>
          <Ionicons
            name='chevron-back'
            size={20}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {displayName}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {isLoading && !languageDetails ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size='large' color={theme.colors.accent} />
          </View>
        ) : (
          <>
            {/* Hierarchy Section */}
            <View
              style={[
                styles.section,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Hierarchy
              </Text>
              {hierarchy && hierarchy.length > 0 ? (
                <HierarchySection
                  type='language'
                  nodes={hierarchy}
                  currentId={selectedLanguageId}
                  onSelectNode={handleSelectNode}
                />
              ) : (
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.textSecondary },
                  ]}>
                  No hierarchy data available
                </Text>
              )}
            </View>

            {/* Language Statistics Section */}
            <View
              style={[
                styles.section,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Language Statistics
              </Text>
              <LanguageStatsSection stats={stats} isLoading={statsLoading} />
            </View>
          </>
        )}
      </ScrollView>

      {/* Select Button */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}>
        <TouchableOpacity
          style={[
            styles.selectButton,
            {
              backgroundColor: theme.colors.accent,
              opacity: selectedLanguageId ? 1 : 0.5,
            },
          ]}
          onPress={handleSelect}
          disabled={!selectedLanguageId}>
          <Text
            style={[
              styles.selectButtonText,
              { color: theme.colors.textInverse },
            ]}>
            Select
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  selectButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
