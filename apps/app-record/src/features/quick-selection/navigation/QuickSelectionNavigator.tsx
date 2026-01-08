import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { QuickSelectionScreen } from '../screens';

export type QuickSelectionStackParamList = {
  QuickSelection: undefined;
  // Add more screens here as needed
  // QuickSelectionSearch: { query?: string };
  // QuickSelectionResults: { results: any[] };
  // QuickSelectionBook: { bookId: string };
  // QuickSelectionChapter: { bookId: string; chapterId: string };
};

const Stack = createStackNavigator<QuickSelectionStackParamList>();

export const QuickSelectionNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: '#f8f8f8' },
      }}>
      <Stack.Screen name='QuickSelection' component={QuickSelectionScreen} />
      {/* Add more screens here as needed */}
    </Stack.Navigator>
  );
};
