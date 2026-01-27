import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/shared/ui';
import { useTheme } from '@/shared/hooks';
import { logger } from '@/shared/utils/logger';
import { ProjectListItem } from '../components';
import { useProjects } from '../hooks';

/**
 * Projects Screen
 *
 * Displays list of projects from local PowerSync database.
 * Users can create and manage projects offline.
 */
export const ProjectsScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { projects, error: projectsError } = useProjects();

  const handleOpenCreateModal = useCallback((): void => {
    router.push('/modals/create-project');
  }, [router]);

  const handleProjectPress = useCallback(
    (projectId: string): void => {
      router.push(`/(tabs)/projects/${projectId}/sequences`);
    },
    [router]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title='Projects'
        rightButtons={[
          {
            icon: (
              <Ionicons
                name='add-circle'
                size={32}
                color={theme.colors.accent}
              />
            ),
            onPress: handleOpenCreateModal,
          },
        ]}
      />
      {projectsError ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Error loading projects: {projectsError.message}
          </Text>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.accent },
            ]}
            onPress={() => {
              // Projects will refetch automatically via useQuery
              logger.info('Retrying projects fetch');
            }}>
            <Text
              style={[
                styles.retryButtonText,
                { color: theme.colors.textInverse },
              ]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : !projects || projects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text
            style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No projects yet
          </Text>
          <Text
            style={[
              styles.emptySubtext,
              { color: theme.colors.textSecondary },
            ]}>
            Tap the + button to create your first project
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.content}
          contentContainerStyle={styles.listContent}
          data={projects}
          keyExtractor={(item): string => item.id}
          renderItem={({ item, index }): React.ReactElement => (
            <View
              style={[
                styles.section,
                {
                  backgroundColor: theme.colors.surface,
                },
              ]}>
              <ProjectListItem
                project={item}
                isLast={index === projects.length - 1}
                onPress={handleProjectPress}
              />
            </View>
          )}
          ListHeaderComponent={<View style={styles.listHeader} />}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
  },
  listHeader: {
    height: 0,
  },
  errorContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
  },
  section: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
