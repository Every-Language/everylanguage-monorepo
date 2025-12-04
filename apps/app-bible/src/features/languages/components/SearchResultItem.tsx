import React, { useCallback } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/hooks/useThemeFromStore';
import type { LanguageSearchResult } from '../services/fuzzySearchService';
import { StyleSheet } from 'react-native';

export interface SearchResultItemProps {
  result: LanguageSearchResult;
  onSelect: (result: LanguageSearchResult) => void;
  versionType: 'audio' | 'text';
  isAvailable: boolean;
  isExpanded?: boolean;
  children?: React.ReactNode;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  onSelect,
  versionType,
  isAvailable,
  isExpanded = false,
  children,
}) => {
  const { theme } = useTheme();

  const handlePress = useCallback(() => {
    if (isAvailable) {
      onSelect(result);
    }
  }, [result, onSelect, isAvailable]);

  const versionCount =
    versionType === 'audio'
      ? result.audio_version_count || 0
      : result.text_version_count || 0;

  const regionText =
    result.regions && Array.isArray(result.regions) && result.regions.length > 0
      ? result.regions[0].region_name
      : '';

  return (
    <TouchableOpacity
      style={[
        styles.searchResultItem,
        {
          backgroundColor: isAvailable
            ? theme.colors.surface
            : theme.colors.background,
        },
        !isAvailable && styles.disabledItem,
      ]}
      onPress={handlePress}
      disabled={!isAvailable}>
      <View style={styles.searchResultContent}>
        <View style={styles.searchResultInfo}>
          <Text
            style={[
              styles.searchResultName,
              {
                color: isAvailable
                  ? theme.colors.text
                  : theme.colors.textSecondary,
              },
            ]}>
            {result.alias_name}
          </Text>

          {result.alias_name !== result.entity_name && (
            <Text
              style={[
                styles.searchResultEntityName,
                { color: theme.colors.textSecondary },
              ]}>
              {result.entity_name}
            </Text>
          )}

          {regionText && (
            <Text
              style={[
                styles.searchResultRegion,
                { color: theme.colors.textSecondary },
              ]}>
              {regionText}
            </Text>
          )}
        </View>

        <View style={styles.searchResultActions}>
          <Text
            style={[
              styles.searchResultCount,
              {
                color: isAvailable
                  ? theme.colors.primary
                  : theme.colors.textSecondary,
              },
            ]}>
            {versionCount} {versionType}
          </Text>
          {isAvailable && (
            <Ionicons
              name={isExpanded ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={theme.colors.textSecondary}
              style={styles.chevronIcon}
            />
          )}
          {!isAvailable && (
            <Text
              style={[
                styles.notAvailableText,
                { color: theme.colors.textSecondary },
              ]}>
              Not available
            </Text>
          )}
        </View>
      </View>
      {isExpanded && (
        <Animated.View
          entering={FadeInDown.duration(160)}
          exiting={FadeOutUp.duration(140)}
          style={[
            styles.expandedContent,
            { borderTopColor: theme.colors.border },
          ]}>
          {children}
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  searchResultItem: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchResultContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  searchResultEntityName: {
    fontSize: 14,
    marginBottom: 4,
  },
  searchResultRegion: {
    fontSize: 12,
  },
  searchResultActions: {
    alignItems: 'flex-end',
  },
  searchResultCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  notAvailableText: {
    fontSize: 12,
    marginTop: 2,
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  disabledItem: {
    opacity: 0.6,
  },
  chevronIcon: {
    marginLeft: 6,
  },
});
