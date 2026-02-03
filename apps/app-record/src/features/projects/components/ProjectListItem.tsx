import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/shared/hooks';
import type { Project } from '../types/project';

export interface ProjectListItemProps {
  project: Project;
  isLast: boolean;
  onPress: (projectId: string) => void;
}

/**
 * Memoized Project List Item Component
 *
 * Optimized list item for FlatList rendering.
 * Uses React.memo to prevent unnecessary re-renders.
 */
export const ProjectListItem = React.memo<ProjectListItemProps>(
  ({ project, isLast, onPress }) => {
    const { theme } = useTheme();

    const handlePress = (): void => {
      onPress(project.id);
    };

    return (
      <TouchableOpacity
        style={[
          isLast ? styles.projectItemLast : styles.projectItem,
          { borderBottomColor: theme.colors.border },
        ]}
        onPress={handlePress}
        accessibilityLabel={`Open project ${project.name}`}>
        <View style={styles.projectItemContent}>
          <Text
            style={[styles.projectItemName, { color: theme.colors.text }]}
            numberOfLines={1}>
            {project.name}
          </Text>
          {project.description && (
            <Text
              style={[
                styles.projectItemDescription,
                { color: theme.colors.textSecondary },
              ]}
              numberOfLines={2}>
              {project.description}
            </Text>
          )}
        </View>
        <Text
          style={[
            styles.projectItemChevron,
            { color: theme.colors.textSecondary },
          ]}>
          ›
        </Text>
      </TouchableOpacity>
    );
  },
  // Custom comparison function for better performance
  (prevProps, nextProps) => {
    return (
      prevProps.project.id === nextProps.project.id &&
      prevProps.project.name === nextProps.project.name &&
      prevProps.project.description === nextProps.project.description &&
      prevProps.isLast === nextProps.isLast
    );
  }
);

ProjectListItem.displayName = 'ProjectListItem';

const styles = StyleSheet.create({
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  projectItemLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
  },
  projectItemContent: {
    flex: 1,
    marginRight: 16,
  },
  projectItemName: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 4,
  },
  projectItemDescription: {
    fontSize: 15,
  },
  projectItemChevron: {
    fontSize: 24,
  },
});
