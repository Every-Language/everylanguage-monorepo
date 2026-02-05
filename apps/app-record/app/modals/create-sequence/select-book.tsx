import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useTranslation } from '@/shared/hooks';
import { useCreateSequenceStore } from '@/features/sequences/store/createSequenceStore';
import { useBooks } from '@/features/sequences/hooks';

/**
 * Select Book Screen
 *
 * Screen for selecting a book when creating a sequence.
 * Includes search functionality and native navigation support.
 */
export default function SelectBookScreen(): React.JSX.Element {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const { setBookId, setChapterId } = useCreateSequenceStore();
  const { books, error: booksError } = useBooks();

  // Filter books by search query
  const filteredBooks = useMemo(() => {
    if (!books) return [];
    if (!searchQuery.trim()) return books;
    const query = searchQuery.toLowerCase();
    return books.filter(book => book.name.toLowerCase().includes(query));
  }, [books, searchQuery]);

  const handleBack = (): void => {
    router.back();
  };

  const handleBookSelect = (selectedBookId: string): void => {
    setChapterId(''); // Reset chapter when book changes
    setBookId(selectedBookId);
    router.back();
  };

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
          onPress={handleBack}
          accessibilityLabel={t('common.back')}>
          <Ionicons
            name='chevron-back'
            size={20}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('sequences.create.selectBook')}
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
            placeholder={t('sequences.create.searchBooks')}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize='none'
            autoCorrect={false}
          />
        </View>

        {/* Books List */}
        <ScrollView style={styles.listContainer}>
          {booksError && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {t('common.error')}: {booksError.message}
              </Text>
            </View>
          )}

          {!booksError && filteredBooks.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary },
                ]}>
                {t('sequences.create.noBooksFound')}
              </Text>
            </View>
          )}

          {filteredBooks.length > 0 && (
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surface },
              ]}>
              {filteredBooks.map((book, index) => (
                <TouchableOpacity
                  key={book.id}
                  style={[
                    index === filteredBooks.length - 1
                      ? styles.itemLast
                      : styles.item,
                    { borderBottomColor: theme.colors.border },
                  ]}
                  onPress={() => handleBookSelect(book.id)}
                  activeOpacity={0.7}>
                  <Text style={[styles.itemText, { color: theme.colors.text }]}>
                    {book.name}
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
