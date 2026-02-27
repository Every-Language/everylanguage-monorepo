import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BibleBooksScreen } from '../screens/BibleBooksScreen';
import { BookChaptersScreen } from '../screens/BookChaptersScreen';
import { ChapterVersesScreen } from '../screens/ChapterVersesScreen';

export type BibleStackParamList = {
  BibleBooks: undefined;
  BibleChapters: { bookId?: string } | undefined;
  BibleVersesChapter: { bookId?: string; chapterId: string };
  BibleVerses: { bookId?: string; chapterId?: string; verseId: string };
};

const BibleStack = createNativeStackNavigator<BibleStackParamList>();

export const BibleStackNavigator: React.FC = () => {
  return (
    <BibleStack.Navigator
      initialRouteName='BibleBooks'
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animationMatchesGesture: true,
      }}>
      <BibleStack.Screen name='BibleBooks' component={BibleBooksScreen} />
      <BibleStack.Screen name='BibleChapters' component={BookChaptersScreen} />
      <BibleStack.Screen
        name='BibleVersesChapter'
        component={ChapterVersesScreen}
      />
      <BibleStack.Screen name='BibleVerses' component={ChapterVersesScreen} />
    </BibleStack.Navigator>
  );
};
