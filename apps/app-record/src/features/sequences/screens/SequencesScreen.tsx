import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/shared/ui';
import { useTheme, useTranslation } from '@/shared/hooks';
import { logger } from '@/shared/utils/logger';
import { useSequences, useBooks, useChaptersForBooks } from '../hooks';
import type { Sequence, Chapter } from '../types/sequence';
import { useProject } from '@/features/projects/hooks';
import { ProjectInfoCard } from '@/features/projects/components';
import { BookSection } from '../components';

/**
 * Sequences Screen
 *
 * Displays list of sequences for a project from local PowerSync database.
 * Users can create and manage sequences offline.
 */
export const SequencesScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = params.projectId || '';

  const { theme } = useTheme();
  const { t } = useTranslation();
  const [collapsedBooks, setCollapsedBooks] = useState<Set<string>>(new Set());
  const { sequences, error: sequencesError } = useSequences(projectId);
  const { books } = useBooks();
  const { project } = useProject(projectId);

  // Get unique book IDs from sequences
  const bookIdsWithSequences = useMemo(() => {
    if (!sequences) return [];
    return Array.from(new Set(sequences.map(s => s.book_id).filter(Boolean)));
  }, [sequences]);

  // Fetch chapters for books that have sequences
  const { chapters: allChapters } = useChaptersForBooks(bookIdsWithSequences);

  // Group sequences by book_id
  const sequencesByBook = useMemo(() => {
    if (!sequences) return new Map<string, Sequence[]>();
    const map = new Map<string, Sequence[]>();
    sequences.forEach(sequence => {
      if (sequence.book_id) {
        const existing = map.get(sequence.book_id) || [];
        map.set(sequence.book_id, [...existing, sequence]);
      }
    });
    return map;
  }, [sequences]);

  // Create map of chapter_id -> sequence
  const sequenceByChapterId = useMemo(() => {
    if (!sequences) return new Map<string, Sequence>();
    const map = new Map<string, Sequence>();
    sequences.forEach(sequence => {
      if (sequence.chapter_id) {
        map.set(sequence.chapter_id, sequence);
      }
    });
    return map;
  }, [sequences]);

  // Group chapters by book_id
  const chaptersByBook = useMemo(() => {
    if (!allChapters) return new Map<string, Chapter[]>();
    const map = new Map<string, Chapter[]>();
    allChapters.forEach((chapter: Chapter) => {
      const existing = map.get(chapter.book_id) || [];
      map.set(chapter.book_id, [...existing, chapter]);
    });
    // Sort chapters within each book by chapter_number
    map.forEach((chapters: Chapter[], bookId: string) => {
      map.set(
        bookId,
        chapters.sort(
          (a: Chapter, b: Chapter) => a.chapter_number - b.chapter_number
        )
      );
    });
    return map;
  }, [allChapters]);

  // Get books that have sequences, sorted by book_number
  const booksWithSequences = useMemo(() => {
    if (!books) return [];
    return books
      .filter(book => bookIdsWithSequences.includes(book.id))
      .sort((a, b) => a.book_number - b.book_number);
  }, [books, bookIdsWithSequences]);

  const handleBack = useCallback((): void => {
    router.back();
  }, [router]);

  const handleOpenCreateSequenceModal = useCallback((): void => {
    router.push({
      pathname: '/modals/create-sequence',
      params: { projectId },
    });
  }, [router, projectId]);

  const handleSequencePress = useCallback(
    (sequenceId: string): void => {
      router.push(
        `/(tabs)/projects/${projectId}/sequences/${sequenceId}/record`
      );
    },
    [router, projectId]
  );

  const toggleBookCollapse = useCallback((bookId: string): void => {
    setCollapsedBooks(prev => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
  }, []);

  const handleEditProject = useCallback((): void => {
    router.push({
      pathname: '/modals/edit-project',
      params: { projectId },
    });
  }, [router, projectId]);

  if (!projectId) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}>
        <AppHeader
          title={t('sequences.title')}
          leftButton={{
            label: t('common.back'),
            onPress: handleBack,
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {t('sequences.noProjectId')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={t('sequences.title')}
        leftButton={{
          label: t('common.back'),
          onPress: handleBack,
        }}
        rightButtons={[
          {
            icon: (
              <Ionicons
                name='add-circle'
                size={32}
                color={theme.colors.accent}
              />
            ),
            onPress: handleOpenCreateSequenceModal,
          },
        ]}
      />
      {sequencesError ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {t('sequences.errorLoading')}: {sequencesError.message}
          </Text>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.accent },
            ]}
            onPress={() => {
              // Sequences will refetch automatically via useQuery
              logger.info('Retrying sequences fetch');
            }}>
            <Text
              style={[
                styles.retryButtonText,
                { color: theme.colors.textInverse },
              ]}>
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : !sequences || sequences.length === 0 ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.emptyContent}>
          <View style={styles.projectCardContainer}>
            <ProjectInfoCard
              project={project}
              onEditPress={handleEditProject}
            />
          </View>
          <View style={styles.emptyContainer}>
            <Text
              style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {t('sequences.empty')}
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                { color: theme.colors.textSecondary },
              ]}>
              {t('sequences.emptySubtext')}
            </Text>
          </View>
        </ScrollView>
      ) : booksWithSequences.length > 0 ? (
        <FlatList
          style={styles.content}
          contentContainerStyle={styles.listContent}
          data={booksWithSequences}
          keyExtractor={(item): string => item.id}
          ListHeaderComponent={
            <View>
              <ProjectInfoCard
                project={project}
                onEditPress={handleEditProject}
              />
            </View>
          }
          renderItem={({ item: book }): React.ReactElement => {
            const bookSequences = sequencesByBook.get(book.id) || [];
            const bookChapters = chaptersByBook.get(book.id) || [];
            const isCollapsed = collapsedBooks.has(book.id);

            return (
              <BookSection
                book={book}
                chapters={bookChapters}
                sequences={bookSequences}
                sequenceByChapterId={sequenceByChapterId}
                isCollapsed={isCollapsed}
                onToggleCollapse={toggleBookCollapse}
                onSequencePress={handleSequencePress}
              />
            );
          }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={10}
          initialNumToRender={5}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text
            style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {t('sequences.empty')}
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
  content: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
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
  emptyContent: {
    paddingTop: 8,
  },
  projectCardContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
