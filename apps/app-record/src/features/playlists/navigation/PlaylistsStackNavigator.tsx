import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { PlaylistsScreen } from '@/features/playlists/screens/PlaylistsScreen';
import { PlaylistItemsScreen } from '@/features/playlists/screens/PlaylistItemsScreen';
import { Playlist } from '../types';

export type PlaylistsStackParamList = {
  PlaylistsHome: undefined;
  PlaylistItems: {
    playlist: Playlist;
  };
};

export type PlaylistsStackNavigationProp =
  NativeStackNavigationProp<PlaylistsStackParamList>;

const PlaylistsStack = createNativeStackNavigator<PlaylistsStackParamList>();

export const PlaylistsStackNavigator: React.FC = () => {
  return (
    <PlaylistsStack.Navigator screenOptions={{ headerShown: false }}>
      <PlaylistsStack.Screen name='PlaylistsHome' component={PlaylistsScreen} />
      <PlaylistsStack.Screen
        name='PlaylistItems'
        component={PlaylistItemsScreen}
      />
    </PlaylistsStack.Navigator>
  );
};
