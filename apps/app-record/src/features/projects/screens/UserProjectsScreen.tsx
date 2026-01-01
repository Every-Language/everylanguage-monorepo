import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useUserProjects } from '../hooks/useUserProjects';
import { useAuth } from '@/features/auth';
import type { UserProject } from '../types';

interface ProjectItemProps {
  userProject: UserProject;
  onPress?: () => void;
}

const ProjectItem: React.FC<ProjectItemProps> = ({ userProject, onPress }) => {
  const { project, role_name } = userProject;

  return (
    <TouchableOpacity
      style={styles.projectItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={`Project: ${project.name}`}>
      <View style={styles.projectContent}>
        <Text style={styles.projectName}>{project.name}</Text>
        {project.description ? (
          <Text style={styles.projectDescription} numberOfLines={2}>
            {project.description}
          </Text>
        ) : null}
        <View style={styles.projectMeta}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{role_name}</Text>
          </View>
          {project.updated_at ? (
            <Text style={styles.updatedText}>
              Updated {new Date(project.updated_at).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface UserProjectsScreenProps {
  onBack?: () => void;
}

export const UserProjectsScreen: React.FC<UserProjectsScreenProps> = ({
  onBack,
}) => {
  const { projects, loading, error } = useUserProjects();
  const { signOut } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    // The useUserProjects hook will automatically refetch when subscription updates
    // For manual refresh, we could add a refetch function to the hook
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleProjectPress = (userProject: UserProject): void => {
    // TODO: Navigate to project detail screen
    console.log('Project pressed:', userProject.project.id);
  };

  if (loading && projects.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {onBack ? (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backButton}
                accessibilityRole='button'
                accessibilityLabel='Back to profile'>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.title}>My Projects</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color='#007AFF' />
          <Text style={styles.loadingText}>Loading projects...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {onBack ? (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backButton}
                accessibilityRole='button'
                accessibilityLabel='Back to profile'>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.title}>My Projects</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading projects</Text>
          <Text style={styles.errorDetail}>{error.message}</Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.retryButton}
            accessibilityRole='button'>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              accessibilityRole='button'
              accessibilityLabel='Back to profile'>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.title}>My Projects</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {projects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No projects found</Text>
          <Text style={styles.emptySubtext}>
            You don&apos;t have access to any projects yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ProjectItem
              userProject={item}
              onPress={() => handleProjectPress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            <Text style={styles.countText}>
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  signOutText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#c00',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  countText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  projectItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  projectContent: {
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  projectDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  projectMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleBadge: {
    backgroundColor: '#e3f2fd',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
  },
  updatedText: {
    fontSize: 12,
    color: '#999',
  },
});
