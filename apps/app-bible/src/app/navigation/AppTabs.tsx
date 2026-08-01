import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { BibleTabContainer } from '@/features/bible/navigation/BibleTabContainer';
import {
  PlaylistsStackNavigator,
  type PlaylistsStackParamList,
} from '@/features/playlists/navigation';
import type { BibleStackParamList } from '@/features/bible/navigation/BibleStackNavigator';

export type AppTabsParamList = {
  Bible: NavigatorScreenParams<BibleStackParamList> | undefined;
  Playlists: NavigatorScreenParams<PlaylistsStackParamList> | undefined;
};

export const AppTabs: React.FC = () => {
  const Tab = createBottomTabNavigator<AppTabsParamList>();

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
