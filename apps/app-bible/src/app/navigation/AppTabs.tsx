import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BibleTabContainer } from '@/features/bible/navigation/BibleTabContainer';
import { PlaylistsStackNavigator } from '@/features/playlists/navigation';

export const AppTabs: React.FC = () => {
  const Tab = createBottomTabNavigator();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: 'none', // Hide default tab bar - using StandaloneTabBar instead
        },
      }}>
      <Tab.Screen name='Bible' component={BibleTabContainer} />
      <Tab.Screen name='Playlists' component={PlaylistsStackNavigator} />
    </Tab.Navigator>
  );
};
