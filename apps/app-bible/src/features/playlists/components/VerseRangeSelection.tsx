import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useLocalization } from '@/shared/hooks';
import type { Theme } from '@everylanguage/shared-native-ui';
import { useVersesPS } from '@/features/bible/hooks/useBible';

// Calculate columns for grid layout
const verseButtonWidth = 56;
const gap = 8;
const horizontalPadding = 32; // 16px on each side

interface VerseRangeSelectionProps {
  chapterId: string;
  onConfirm: (startVerseId: string, endVerseId: string) => void;
}

export const VerseRangeSelection: React.FC<VerseRangeSelectionProps> = ({
  chapterId,
  onConfirm,
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLocalization();

  const [startVerseNumber, setStartVerseNumber] = useState<number | null>(null);
  const [endVerseNumber, setEndVerseNumber] = useState<number | null>(null);

  const { width: screenWidth } = useWindowDimensions();

  const numColumns = useMemo(() => {
    const availableWidth = screenWidth - horizontalPadding;
    return Math.floor(availableWidth / (verseButtonWidth + gap));
  }, [screenWidth]);

  const { verses, loading } = useVersesPS(chapterId);

  const styles = createStyles(theme);

  const isValidRange = useMemo(() => {
    if (startVerseNumber === null || endVerseNumber === null) return false;
    return startVerseNumber <= endVerseNumber;
  }, [startVerseNumber, endVerseNumber]);

  const handleVersePress = useCallback(
    (verseNumber: number) => {
      if (startVerseNumber === null) {
        // First selection: set start verse only
        setStartVerseNumber(verseNumber);
        setEndVerseNumber(null);
      } else if (endVerseNumber === null) {
        // Second selection: set end verse
        if (verseNumber >= startVerseNumber) {
          setEndVerseNumber(verseNumber);
        } else {
          // If selected before start, make it the new start
          setEndVerseNumber(startVerseNumber);
          setStartVerseNumber(verseNumber);
        }
      } else {
        // Reset selection: start new range
        setStartVerseNumber(verseNumber);
        setEndVerseNumber(null);
      }
    },
    [startVerseNumber, endVerseNumber]
  );

  const handleConfirm = useCallback(() => {
    if (!isValidRange || startVerseNumber === null || endVerseNumber === null)
      return;

    const startVerse = verses.find(v => v.verse_number === startVerseNumber);
    const endVerse = verses.find(v => v.verse_number === endVerseNumber);

    if (startVerse && endVerse) {
      onConfirm(startVerse.id, endVerse.id);
      // Reset selection
      setStartVerseNumber(null);
      setEndVerseNumber(null);
      // Don't call onClose() here - let the parent control the flow
    }
  }, [isValidRange, startVerseNumber, endVerseNumber, verses, onConfirm]);

  const handleAddFullChapter = useCallback(() => {
    if (verses.length === 0) return;
    const firstVerse = verses[0];
    const lastVerse = verses[verses.length - 1];
    if (firstVerse && lastVerse) {
      onConfirm(firstVerse.id, lastVerse.id);
      setStartVerseNumber(null);
      setEndVerseNumber(null);
      // Don't call onClose() here - let the parent control the flow
    }
  }, [verses, onConfirm]);

  const isVerseSelected = useCallback(
    (verseNumber: number) => {
      if (startVerseNumber === null) return false;
      // If only start is selected, only highlight that verse
      if (endVerseNumber === null) {
        return verseNumber === startVerseNumber;
      }
      // If both are selected, highlight the range
      return verseNumber >= startVerseNumber && verseNumber <= endVerseNumber;
    },
    [startVerseNumber, endVerseNumber]
  );

  const isVerseStart = useCallback(
    (verseNumber: number) => verseNumber === startVerseNumber,
    [startVerseNumber]
  );
  const isVerseEnd = useCallback(
    (verseNumber: number) => verseNumber === endVerseNumber,
    [endVerseNumber]
  );

  // Render individual verse item
  const renderVerseItem = useCallback(
    ({ item: verse }: { item: (typeof verses)[0] }) => {
      const selected = isVerseSelected(verse.verse_number);
      const isStart = isVerseStart(verse.verse_number);
      const isEnd = isVerseEnd(verse.verse_number);

      return (
        <TouchableOpacity
          style={[
            styles.verseButton,
            {
              backgroundColor: selected
                ? theme.colors.primary
                : theme.mode === 'light'
                  ? theme.colors.surface
                  : theme.colors.surfaceVariant,
            },
            (isStart || isEnd) && [
              styles.verseButtonEdge,
              {
                borderColor:
                  theme.mode === 'light'
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(255, 255, 255, 0.3)',
              },
            ],
          ]}
          onPress={() => handleVersePress(verse.verse_number)}>
          <Text
            style={[
              styles.verseNumber,
              {
                color: selected ? theme.colors.textInverse : theme.colors.text,
              },
            ]}>
            {verse.verse_number}
          </Text>
        </TouchableOpacity>
      );
    },
    [
      theme,
      styles.verseButton,
      styles.verseButtonEdge,
      styles.verseNumber,
      isVerseSelected,
      isVerseStart,
      isVerseEnd,
      handleVersePress,
    ]
  );

  // List header component
  const renderListHeader = useCallback(() => {
    return (
      <>
        <TouchableOpacity
          style={[
            styles.fullChapterButton,
            {
              backgroundColor:
                theme.mode === 'light'
                  ? theme.colors.surface
                  : theme.colors.surfaceVariant,
              borderColor: theme.colors.primary,
            },
          ]}
          onPress={handleAddFullChapter}>
          <Ionicons
            name='book-outline'
            size={20}
            color={theme.colors.primary}
          />
          <Text
            style={[styles.fullChapterText, { color: theme.colors.primary }]}>
            {t('playlists.addFullChapter', 'Add Full Chapter')}
          </Text>
        </TouchableOpacity>
        {/* Range indicator */}
        {startVerseNumber !== null && (
          <View
            style={[
              styles.rangeIndicator,
              {
                backgroundColor: theme.colors.surfaceOverlay,
              },
            ]}>
            <Text style={[styles.rangeText, { color: theme.colors.primary }]}>
              {endVerseNumber === null || startVerseNumber === endVerseNumber
                ? t('playlists.verseSelected', 'Verse {{verse}}', {
                    verse: startVerseNumber,
                  })
                : t('playlists.versesSelected', 'Verses {{start}}-{{end}}', {
                    start: startVerseNumber,
                    end: endVerseNumber,
                  })}
            </Text>
          </View>
        )}

        <Text
          style={[
            styles.instructionText,
            { color: theme.colors.textSecondary },
          ]}>
          {t(
            'playlists.selectVerseInstructions',
            'Tap verses to select a range'
          )}
        </Text>
      </>
    );
  }, [
    theme,
    handleAddFullChapter,
    t,
    startVerseNumber,
    endVerseNumber,
    styles.fullChapterButton,
    styles.fullChapterText,
    styles.rangeIndicator,
    styles.rangeText,
    styles.instructionText,
  ]);

  // List footer component for extra spacing
  const renderListFooter = useCallback(() => {
    return (
      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            {
              backgroundColor: isValidRange
                ? theme.colors.primary
                : theme.colors.interactiveDisabled,
            },
          ]}
          onPress={handleConfirm}
          disabled={!isValidRange}>
          <Text
            style={[
              styles.confirmButtonText,
              { color: theme.colors.textInverse },
            ]}>
            {t('common.confirm', 'Confirm')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [
    insets.bottom,
    isValidRange,
    handleConfirm,
    styles.footer,
    styles.confirmButton,
    styles.confirmButtonText,
    t,
    theme.colors.interactiveDisabled,
    theme.colors.primary,
    theme.colors.textInverse,
  ]);

  const keyExtractor = useCallback((item: (typeof verses)[0]) => item.id, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <FlatList
          data={verses}
          renderItem={renderVerseItem}
          keyExtractor={keyExtractor}
          numColumns={numColumns}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          removeClippedSubviews={true}
        />
      </View>

      {renderListFooter()}
    </>
  );
};

const createStyles = (theme: Theme) =>
  /* eslint-disable */
  StyleSheet.create({
    container: {
      flex: 1,
    },
    rangeIndicator: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    rangeText: {
      fontSize: 14,
      fontWeight: '600',
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    columnWrapper: {
      justifyContent: 'center',
      gap: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 200,
      paddingHorizontal: 20,
    },
    fullChapterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 12,
      marginTop: 16,
      marginBottom: 16,
      gap: 8,
      borderWidth: 2,
    },
    fullChapterText: {
      fontSize: 16,
      fontWeight: '600',
    },
    instructionText: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 16,
    },
    verseButton: {
      width: 56,
      height: 56,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    verseButtonEdge: {
      borderWidth: 2,
    },
    verseNumber: {
      fontSize: 16,
      fontWeight: '600',
    },
    footer: {
      paddingHorizontal: 20,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor:
        theme.mode === 'light'
          ? theme.colors.border
          : theme.colors.surfaceVariant,
      backgroundColor: theme.colors.modalBackground,
    },
    confirmButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
