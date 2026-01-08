import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/shared/hooks';
import { BibleTabContainer } from '@/features/bible/navigation/BibleTabContainer';
import { PlaylistsStackNavigator } from '@/features/playlists/navigation';

export const AppTabs: React.FC = () => {
  const Tab = createBottomTabNavigator();
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          height: 56,
          borderTopWidth: 0,
          elevation: 0,
          display: 'none',
        },
      }}>
      <Tab.Screen name='Bible' component={BibleTabContainer} />
      <Tab.Screen name='Playlists' component={PlaylistsStackNavigator} />
    </Tab.Navigator>
  );
};
