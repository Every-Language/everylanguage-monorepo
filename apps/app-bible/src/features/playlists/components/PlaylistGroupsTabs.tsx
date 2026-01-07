import React from 'react';
import { useTheme } from '@everylanguage/shared-native-ui';
import { StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { usePlaylistGroupsPS } from '../hooks/usePlaylistGroupsPS';

interface PlaylistGroupsTabsProps {
  activeTab: string | null;
  onTabPress: (tab: string | null) => void;
}

export const PlaylistGroupsTabs: React.FC<PlaylistGroupsTabsProps> = ({
  activeTab,
  onTabPress,
}) => {
  const { theme } = useTheme();
  const { playlistGroups } = usePlaylistGroupsPS();

  const myPlaylists = {
    id: null,
    name: 'My Playlists',
  };

  return (
    <ScrollView
      horizontal
      style={styles.tabContainer}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabContent}>
      {[myPlaylists, ...playlistGroups].map(({ id, name }) => (
        <TouchableOpacity
          key={id}
          style={[
            styles.tab,
            activeTab === id && [
              styles.activeTab,
              { backgroundColor: theme.colors.primary },
            ],
            [
              styles.tabBorder,
              {
                borderColor:
                  activeTab === id ? theme.colors.primary : theme.colors.text,
              },
            ],
          ]}
          onPress={() => onTabPress(id)}>
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === id
                    ? theme.colors.textInverse
                    : theme.colors.text,
              },
            ]}>
            {name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    paddingVertical: 8,
    flexGrow: 0,
  },
  tabContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tabBorder: {
    borderWidth: 1,
  },
  activeTab: {},
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
