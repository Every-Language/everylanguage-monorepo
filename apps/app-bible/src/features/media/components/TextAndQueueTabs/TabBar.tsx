import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';

type TabKey = 'text' | 'queue';

interface TabBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const TabBar: React.FC<TabBarProps> = React.memo(function TabBar({
  activeTab,
  onTabChange,
}) {
  const { theme } = useTheme();
  const { t } = useLocalization();

  return (
    <View style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}>
      {(['text', 'queue'] as TabKey[]).map(key => (
        <TouchableOpacity
          key={key}
          onPress={() => onTabChange(key)}
          style={[
            styles.tabButton,
            styles.flex1,
            activeTab === key && { backgroundColor: theme.colors.primary },
          ]}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.tabLabel,
              {
                color:
                  activeTab === key
                    ? theme.colors.background
                    : theme.colors.text,
              },
            ]}>
            {key === 'text' ? t('common.text') : t('bible.queue')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  flex1: { flex: 1 },
});
