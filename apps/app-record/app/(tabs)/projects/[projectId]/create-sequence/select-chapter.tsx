import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useTranslation } from '@/shared/hooks';
import { useCreateSequenceStore } from '@/features/sequences/store/createSequenceStore';
import { useChapters } from '@/features/sequences/hooks';

/**
 * Select Chapter Screen
 *
 * Screen for selecting a chapter when creating a sequence.
 * Includes search functionality and native navigation support.
 */
export default function SelectChapterScreen(): React.JSX.Element {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const { book_id, setChapterId } = useCreateSequenceStore();
  const { chapters, error: chaptersError } = useChapters(book_id);

  // Redirect if no book selected
  useEffect(() => {
    if (!book_id) {
      router.back();
    }
  }, [book_id, router]);

  // Filter chapters by search query
  const filteredChapters = useMemo(() => {
    if (!chapters) return [];
    if (!searchQuery.trim()) return chapters;
    const query = searchQuery.toLowerCase();
    return chapters.filter(chapter =>
      chapter.chapter_number.toString().includes(query)
    );
  }, [chapters, searchQuery]);

  const handleBack = (): void => {
    router.back();
  };

  const handleChapterSelect = (selectedChapterId: string): void => {
    setChapterId(selectedChapterId);
    router.back();
  };

  if (!book_id) {
    return <View />;
  }

  return (
    <SafeAreaView
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
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel={t('common.back')}>
          <Ionicons name='chevron-back' size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('sequences.create.selectChapter')}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.colors.surface },
          ]}>
          <Ionicons
            name='search'
            size={20}
            color={theme.colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: theme.colors.text,
              },
            ]}
            placeholder={t('sequences.create.searchChapters')}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            keyboardType='numeric'
            autoCapitalize='none'
            autoCorrect={false}
          />
        </View>

        {/* Chapters List */}
        <ScrollView style={styles.listContainer}>
          {chaptersError && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {t('common.error')}: {chaptersError.message}
              </Text>
            </View>
          )}

          {!chaptersError && filteredChapters.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary },
                ]}>
                {t('sequences.create.noChaptersFound')}
              </Text>
            </View>
          )}

          {filteredChapters.length > 0 && (
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surface },
              ]}>
              {filteredChapters.map((chapter, index) => (
                <TouchableOpacity
                  key={chapter.id}
                  style={[
                    index === filteredChapters.length - 1
                      ? styles.itemLast
                      : styles.item,
                    { borderBottomColor: theme.colors.border },
                  ]}
                  onPress={() => handleChapterSelect(chapter.id)}
                  activeOpacity={0.7}>
                  <Text style={[styles.itemText, { color: theme.colors.text }]}>
                    {t('sequences.create.chapterNumber', {
                      number: chapter.chapter_number,
                    })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
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
  backButton: {
    width: 32,
    height: 32,
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
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 4,
  },
  listContainer: {
    flex: 1,
    paddingTop: 8,
  },
  section: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
  },
  itemText: {
    fontSize: 17,
    fontWeight: '400',
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
    fontSize: 15,
    textAlign: 'center',
  },
});
