import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';

interface VersionInfo {
  name: string;
  languageName: string;
}

interface VersionSelectionCardProps {
  type: 'audio' | 'text';
  title: string;
  subtitle: string;
  currentVersion: VersionInfo | null;
  onPress: () => void;
  isSelected: boolean;
}

export const VersionSelectionCard: React.FC<VersionSelectionCardProps> = ({
  type,
  title,
  subtitle,
  currentVersion,
  onPress,
  isSelected,
}) => {
  const { theme } = useTheme();

  const isAudio = type === 'audio';
  const icon = isAudio ? 'volume-high' : 'book';

  return (
    <TouchableOpacity
      style={[
        styles.versionCard,
        {
          backgroundColor: theme.colors.secondary,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          <Text
            style={[
              styles.cardSubtitle,
              { color: theme.colors.textSecondary },
            ]}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.cardActions}>
          {isSelected ? (
            <MaterialIcons
              name='check'
              size={24}
              color={theme.colors.primary}
            />
          ) : (
            <MaterialIcons
              name='close'
              size={24}
              color={theme.colors.textSecondary}
            />
          )}
        </View>
      </View>

      {currentVersion && (
        <View
          style={[
            styles.selectedVersionInfo,
            { borderTopColor: theme.colors.border },
          ]}>
          <Text
            style={[styles.selectedVersionName, { color: theme.colors.text }]}>
            {currentVersion.name}
          </Text>
          <Text
            style={[
              styles.selectedVersionLanguage,
              { color: theme.colors.textSecondary },
            ]}>
            {currentVersion.languageName}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  versionCard: {
    borderRadius: 16,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedVersionInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  selectedVersionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectedVersionLanguage: {
    fontSize: 14,
  },
});
