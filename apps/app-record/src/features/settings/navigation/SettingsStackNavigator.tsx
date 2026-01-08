import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SettingsScreen } from '../screens';

const Stack = createStackNavigator();

/**
 * Settings stack navigator
 */
export const SettingsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: 'transparent' },
      }}>
      <Stack.Screen name='SettingsMain' component={SettingsScreen} />
    </Stack.Navigator>
  );
};
