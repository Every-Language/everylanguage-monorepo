import React, { useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useTranslation } from '@/shared/hooks';
import { useCreateSequenceStore } from '@/features/sequences/store/createSequenceStore';
import {
  useBooks,
  useChapters,
  useCreateSequence,
} from '@/features/sequences/hooks';

/**
 * Create Sequence Form Screen
 *
 * Main form screen for creating a new sequence.
 * Allows selection of book and chapter.
 */
export default function CreateSequenceFormScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = params.projectId || '';

  const { theme } = useTheme();
  const { t } = useTranslation();
  const { book_id, chapter_id, reset } = useCreateSequenceStore();
  const { books } = useBooks();
  const { chapters } = useChapters(book_id);
  const { createSequence, isLoading, error } = useCreateSequence();

  // Reset form when component unmounts
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // Get selected book name
  const selectedBookName = useMemo(() => {
    if (!book_id || !books) return null;
    const book = books.find(b => b.id === book_id);
    return book?.name || null;
  }, [book_id, books]);

  // Get selected chapter number
  const selectedChapterNumber = useMemo(() => {
    if (!chapter_id || !chapters) return null;
    const chapter = chapters.find(c => c.id === chapter_id);
    return chapter?.chapter_number || null;
  }, [chapter_id, chapters]);

  const handleClose = useCallback((): void => {
    reset();
    router.back();
  }, [router, reset]);

  const handleSelectBook = useCallback((): void => {
    // Navigate to select-book route within the create-sequence stack
    // Using absolute path to ensure correct resolution within nested modal stack
    const path = `/(tabs)/projects/${projectId}/create-sequence/select-book`;
    router.push(path);
  }, [router, projectId]);

  const handleSelectChapter = useCallback((): void => {
    if (!book_id) return;
    // Navigate to select-chapter route within the create-sequence stack
    // Using absolute path to ensure correct resolution within nested modal stack
    const path = `/(tabs)/projects/${projectId}/create-sequence/select-chapter`;
    router.push(path);
  }, [router, projectId, book_id]);

  const handleCreate = useCallback(async (): Promise<void> => {
    if (!book_id || !chapter_id) {
      Alert.alert(
        t('common.error'),
        t('sequences.create.bookAndChapterRequired')
      );
      return;
    }

    try {
      // Auto-generate name from book and chapter
      const book = books?.find(b => b.id === book_id);
      const chapter = chapters?.find(c => c.id === chapter_id);

      if (!book || !chapter) {
        throw new Error('Could not find book or chapter');
      }

      const name = `${book.name} ${chapter.chapter_number}`;

      await createSequence(
        {
          name,
          description: '',
          book_id,
          chapter_id,
        },
        projectId
      );

      handleClose();
    } catch (err) {
      // Error is already logged in useCreateSequence hook
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('sequences.create.error')
      );
    }
  }, [
    book_id,
    chapter_id,
    books,
    chapters,
    createSequence,
    projectId,
    handleClose,
    t,
  ]);

  const isFormValid = book_id.length > 0 && chapter_id.length > 0;

  // Display error if any
  useEffect(() => {
    if (error) {
      Alert.alert(t('common.error'), error.message);
    }
  }, [error, t]);

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
          style={[styles.closeButton, { backgroundColor: theme.colors.error }]}
          onPress={handleClose}
          accessibilityLabel={t('common.close')}>
          <Ionicons name='close' size={20} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('sequences.create.title')}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Form Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        {/* Book Selection Field */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            {t('sequences.create.book')}{' '}
            <Text style={[styles.required, { color: theme.colors.error }]}>
              *
            </Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.selectField,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
            onPress={handleSelectBook}>
            <View style={styles.selectFieldContent}>
              <Text
                style={[styles.selectFieldText, { color: theme.colors.text }]}>
                {t('sequences.create.selectBook')}
              </Text>
              {selectedBookName && (
                <Text
                  style={[
                    styles.selectedValueText,
                    { color: theme.colors.textSecondary },
                  ]}>
                  {selectedBookName}
                </Text>
              )}
            </View>
            <Ionicons
              name='chevron-forward'
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Chapter Selection Field */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            {t('sequences.create.chapter')}{' '}
            <Text style={[styles.required, { color: theme.colors.error }]}>
              *
            </Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.selectField,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
              !book_id && styles.selectFieldDisabled,
            ]}
            onPress={handleSelectChapter}
            disabled={!book_id}>
            <View style={styles.selectFieldContent}>
              <Text
                style={[styles.selectFieldText, { color: theme.colors.text }]}>
                {t('sequences.create.selectChapter')}
              </Text>
              {selectedChapterNumber && (
                <Text
                  style={[
                    styles.selectedValueText,
                    { color: theme.colors.textSecondary },
                  ]}>
                  {t('sequences.create.chapterNumber', {
                    number: selectedChapterNumber,
                  })}
                </Text>
              )}
            </View>
            <Ionicons
              name='chevron-forward'
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer with Create Button */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}>
        <TouchableOpacity
          style={[
            styles.createButton,
            {
              backgroundColor:
                isFormValid && !isLoading
                  ? theme.colors.accent
                  : theme.colors.interactiveDisabled,
            },
          ]}
          onPress={handleCreate}
          disabled={!isFormValid || isLoading}
          accessibilityLabel={t('sequences.create.createButton')}>
          {isLoading ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text
              style={[
                styles.createButtonText,
                {
                  color: isFormValid
                    ? theme.colors.textInverse
                    : theme.colors.textSecondary,
                },
              ]}>
              {t('sequences.create.createButton')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    // Color will be set dynamically via theme
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  selectFieldContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectFieldText: {
    fontSize: 17,
  },
  selectedValueText: {
    fontSize: 15,
    marginRight: 8,
  },
  selectFieldDisabled: {
    opacity: 0.5,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  createButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
