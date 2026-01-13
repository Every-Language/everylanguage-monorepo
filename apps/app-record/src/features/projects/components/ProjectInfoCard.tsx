import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import type { Project } from '../types/project';

export interface ProjectInfoCardProps {
  project: Project | null;
  onEditPress?: () => void;
}

/**
 * Project Info Card Component
 *
 * Displays project information in a card format.
 * Shows project name, description, source language, target language, and region.
 * Memoized to prevent unnecessary re-renders.
 */
export const ProjectInfoCard = React.memo<ProjectInfoCardProps>(
  ({ project, onEditPress }) => {
    const { theme } = useTheme();

    if (!project) {
      return null;
    }

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
          },
        ]}>
        {/* Header with Edit Button */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text
              style={[styles.title, { color: theme.colors.text }]}
              numberOfLines={2}>
              {project.name}
            </Text>
          </View>
          {onEditPress && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={onEditPress}
              accessibilityLabel='Edit project'
              accessibilityRole='button'>
              <View
                style={[
                  styles.editButtonCircle,
                  {
                    backgroundColor: theme.colors.accent,
                  },
                ]}>
                <Ionicons
                  name='pencil'
                  size={14}
                  color={theme.colors.textInverse}
                />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Description */}
        {project.description && (
          <Text
            style={[styles.description, { color: theme.colors.textSecondary }]}
            numberOfLines={3}>
            {project.description}
          </Text>
        )}

        {/* Info Items */}
        <View style={styles.infoContainer}>
          {project.source_language_name && (
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}>
                Source Language:
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {project.source_language_name}
              </Text>
            </View>
          )}

          {project.target_language_name && (
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}>
                Target Language:
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {project.target_language_name}
              </Text>
            </View>
          )}

          {project.region_name && (
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}>
                Region:
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {project.region_name}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for better performance
    if (prevProps.project === null && nextProps.project === null) return true;
    if (prevProps.project === null || nextProps.project === null) return false;

    return (
      prevProps.project.id === nextProps.project.id &&
      prevProps.project.name === nextProps.project.name &&
      prevProps.project.description === nextProps.project.description &&
      prevProps.project.source_language_name ===
        nextProps.project.source_language_name &&
      prevProps.project.target_language_name ===
        nextProps.project.target_language_name &&
      prevProps.project.region_name === nextProps.project.region_name &&
      prevProps.onEditPress === nextProps.onEditPress
    );
  }
);

ProjectInfoCard.displayName = 'ProjectInfoCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  editButton: {
    padding: 0,
    marginTop: -4,
    marginRight: -4,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  editButtonCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 15,
    marginBottom: 16,
    lineHeight: 20,
  },
  infoContainer: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});
