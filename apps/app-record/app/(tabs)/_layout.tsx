import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/hooks';

/**
 * Tabs Layout
 *
 * Floating tab bar with rounded corners and solid background.
 * Selected tab shows accent color for text and icons.
 */
const TabsLayout: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const bottomInset = Math.max(insets.bottom - 8, 16);
  const horizontalMargin = Math.max(insets.bottom - 8, 16);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.text,
        tabBarStyle: {
          position: 'absolute',
          bottom: bottomInset,
          left: horizontalMargin,
          right: horizontalMargin,
          backgroundColor: theme.colors.surface,
          borderRadius: 9999,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          elevation: 8,
          shadowColor: theme.colors.shadow || '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          paddingHorizontal: 4,
          paddingVertical: 4,
          paddingBottom: 4,
          paddingTop: 4,
          height: 'auto',
          minHeight: 60,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 6,
          paddingHorizontal: 8,
          flex: 1,
        },
      }}>
      <Tabs.Screen
        name='projects'
        options={{
          title: 'Projects',
          tabBarLabel: 'Projects',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={'book'} size={focused ? 24 : 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='projects/[projectId]'
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name='record'
        options={{
          title: 'Record',
          tabBarLabel: 'Record',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={'mic'} size={focused ? 24 : 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='publish'
        options={{
          title: 'Publish',
          tabBarLabel: 'Publish',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={'cloud-upload'}
              size={focused ? 24 : 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='menu'
        options={{
          title: 'Menu',
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={'menu'} size={focused ? 24 : 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
