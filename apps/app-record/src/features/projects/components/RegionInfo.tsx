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
  RegionStatsSection,
} from '@/features/languages/components';
import {
  useRegionDetails,
  useRegionHierarchy,
  useRegionStats,
} from '@/features/languages/hooks';

export interface RegionInfoProps {
  regionId: string;
  regionName: string;
  fromView?: boolean;
  onBack: () => void;
  onSelect: (regionId: string, regionName: string) => void;
}

/**
 * Region Info Component
 *
 * Displays detailed information about a selected region including:
 * - Hierarchy (expandable tree with menu to select other regions)
 * - Region statistics (population, languages, people groups)
 * - Select button to confirm selection
 */
export const RegionInfo: React.FC<RegionInfoProps> = ({
  regionId,
  regionName,
  onBack,
  onSelect,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [selectedRegionId, setSelectedRegionId] = useState<string>(
    regionId || ''
  );
  const [selectedRegionName, setSelectedRegionName] = useState<string>(
    regionName || ''
  );

  const { data: regionDetails, isLoading: detailsLoading } =
    useRegionDetails(selectedRegionId);
  const { data: hierarchy, isLoading: hierarchyLoading } =
    useRegionHierarchy(selectedRegionId);
  const { data: stats, isLoading: statsLoading } =
    useRegionStats(selectedRegionId);

  const handleSelectNode = useCallback(
    (nodeId: string, nodeName: string): void => {
      setSelectedRegionId(nodeId);
      setSelectedRegionName(nodeName);
    },
    []
  );

  const handleSelect = useCallback((): void => {
    if (!selectedRegionId || !selectedRegionName) return;
    onSelect(selectedRegionId, selectedRegionName);
  }, [selectedRegionId, selectedRegionName, onSelect]);

  const displayName = selectedRegionName || regionDetails?.name || 'Loading...';
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
        {isLoading && !regionDetails ? (
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
                  type='region'
                  nodes={hierarchy}
                  currentId={selectedRegionId}
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

            {/* Region Statistics Section */}
            <View
              style={[
                styles.section,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Region Statistics
              </Text>
              <RegionStatsSection stats={stats} isLoading={statsLoading} />
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
              opacity: selectedRegionId ? 1 : 0.5,
            },
          ]}
          onPress={handleSelect}
          disabled={!selectedRegionId}>
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
