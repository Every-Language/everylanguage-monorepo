import React, { useCallback, useEffect } from 'react';
import { StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/shared/hooks';
import type { RootStackParamList } from '@/app/navigation/RootNavigator';
import { useQuickSelectionStore } from '../store/quickSelectionStore';
import { ModalHeader } from '../components/ModalHeader';
import { BookSelectionMode } from '../components/BookSelectionMode';
import { ChapterSelectionMode } from '../components/ChapterSelectionMode';
import { VerseSelectionMode } from '../components/VerseSelectionMode';

export const QuickSelectionScreen: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    currentMode,
    selectedBook,
    selectedChapter,
    reset,
    canGoBack,
    setOnClose,
  } = useQuickSelectionStore();

  const handleClose = useCallback(() => {
    reset();
    navigation.goBack();
  }, [navigation, reset]);

  const handleBack = useCallback(() => {
    // This will be handled by the store's goBack method
  }, []);

  // Set the close callback in the store
  useEffect(() => {
    setOnClose(() => {
      reset();
      navigation.goBack();
    });
  }, [setOnClose, reset, navigation]);

  // Reset when component unmounts (backup safety)
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const renderCurrentMode = () => {
    switch (currentMode) {
      case 'book':
        return <BookSelectionMode />;
      case 'chapter':
        if (!selectedBook) {
          return <BookSelectionMode />;
        }
        return <ChapterSelectionMode book={selectedBook} />;
      case 'verse':
        if (!selectedBook || !selectedChapter) {
          return <BookSelectionMode />;
        }
        return (
          <VerseSelectionMode book={selectedBook} chapter={selectedChapter} />
        );
      default:
        return <BookSelectionMode />;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingTop: Platform.OS === 'android' ? insets.top : 0,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ModalHeader
        title='Quick Selection'
        showClose={true}
        onClose={handleClose}
        showBack={canGoBack()}
        onBack={handleBack}
      />
      {renderCurrentMode()}
    </SafeAreaView>
  );
};
