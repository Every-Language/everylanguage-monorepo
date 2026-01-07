import React from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useNavigationState,
  CommonActions,
  useNavigationContainerRef,
} from '@react-navigation/native';

type TabRoute = 'Bible' | 'Playlists';

export const StandaloneTabBar: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const navigationRef = useNavigationContainerRef();

  // Get current route name from navigation state - find the bottom tab navigator
  const routeName = useNavigationState(state => {
    // Find the bottom tab navigator in the state tree
    const findBottomTabState = (navState: unknown): TabRoute | null => {
      if (!navState || typeof navState !== 'object') return null;

      const navStateObj = navState as {
        routes?: Array<{ name?: string }>;
        index?: number;
      };
      // Check if this is a bottom tab navigator (has routes with 'Bible' or 'Playlists')
      const routes = navStateObj.routes || [];
      const hasBottomTabs = routes.some(
        r => r.name === 'Bible' || r.name === 'Playlists'
      );

      if (hasBottomTabs && navStateObj.index !== undefined) {
        const currentRoute = routes[navStateObj.index];
        return currentRoute?.name as TabRoute;
      }

      // Recursively search nested navigators
      for (const route of routes) {
        const routeWithState = route as { state?: unknown };
        if (routeWithState.state) {
          const result = findBottomTabState(routeWithState.state);
          if (result) return result;
        }
      }

      return null;
    };

    return findBottomTabState(state) || 'Bible';
  });

  const handleTabPress = (tabName: TabRoute) => {
    // Get the navigation state to find the bottom tab navigator
    const state = navigation.getState();

    // Find the bottom tab navigator key by searching through the navigation state
    const findBottomTabKey = (navState: unknown): string | null => {
      if (!navState || typeof navState !== 'object') return null;

      const navStateObj = navState as {
        routes?: Array<{ name?: string; state?: unknown }>;
        key?: string;
      };
      const routes = navStateObj.routes || [];

      // Check if this navigator has bottom tabs
      const hasBottomTabs = routes.some(
        r => r.name === 'Bible' || r.name === 'Playlists'
      );

      if (hasBottomTabs && navStateObj.key) {
        return navStateObj.key;
      }

      // Recursively search nested navigators
      for (const route of routes) {
        if (route.state) {
          const result = findBottomTabKey(route.state);
          if (result) return result;
        }
      }

      return null;
    };

    // Search for bottom tab navigator in the entire state tree
    let bottomTabKey = findBottomTabKey(state);

    // If not found at root, search within Home route
    if (!bottomTabKey) {
      const findHomeRoute = (navState: unknown): { state?: unknown } | null => {
        if (!navState || typeof navState !== 'object') return null;
        const navStateObj = navState as {
          routes?: Array<{ name?: string; state?: unknown }>;
        };
        const routes = navStateObj.routes || [];
        const homeRoute = routes.find(r => r.name === 'Home');
        if (homeRoute) return homeRoute as { state?: unknown };
        for (const route of routes) {
          if (route.state) {
            const result = findHomeRoute(route.state);
            if (result) return result;
          }
        }
        return null;
      };

      const homeRoute = findHomeRoute(state);
      if (homeRoute?.state) {
        bottomTabKey = findBottomTabKey(homeRoute.state);
      }
    }

    if (bottomTabKey) {
      // Dispatch navigation action directly to the bottom tab navigator
      // Use JUMP_TO action which is specific to bottom tab navigators
      navigation.dispatch({
        type: 'JUMP_TO',
        payload: {
          name: tabName,
        },
        target: bottomTabKey,
      });
    } else {
      // Fallback: use navigation container ref or try navigating through root
      if (navigationRef?.current) {
        // Use the navigation container ref to navigate
        try {
          (
            navigationRef.current as {
              navigate: (name: string, params?: { screen: string }) => void;
            }
          ).navigate('Home', {
            screen: tabName,
          });
        } catch {
          // Navigation failed, fall through to next method
        }
      } else {
        // Try using CommonActions to navigate to Home with nested screen
        try {
          navigation.dispatch(
            CommonActions.navigate({
              name: 'Home',
              params: {
                screen: tabName,
              },
            }) as {
              type: string;
              payload?: { name: string; params?: { screen: string } };
            }
          );
        } catch {
          // Navigation failed
        }
      }
    }
  };

  const tabs: Array<{
    name: TabRoute;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }> = [
    {
      name: 'Bible',
      icon: 'book-outline',
      label: t('bible.title', { defaultValue: 'Bible' }),
    },
    {
      name: 'Playlists',
      icon: 'list-outline',
      label: t('playlists.title', { defaultValue: 'Playlists' }),
    },
  ];

  const containerStyle = [
    styles.container,
    {
      paddingBottom: Math.max(insets.bottom, 8),
      ...(Platform.OS === 'ios' ? { zIndex: 9999 } : {}),
      ...(Platform.OS === 'android' ? { elevation: 9999 } : {}),
    },
  ];

  return (
    <View style={containerStyle} pointerEvents='box-none'>
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.shadow || '#000',
          },
        ]}>
        {tabs.map(tab => {
          const isFocused = routeName === tab.name;
          const textColor = isFocused
            ? theme.colors.background
            : theme.colors.text;

          return (
            <TouchableOpacity
              key={tab.name}
              accessibilityRole='button'
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={tab.label}
              onPress={() => handleTabPress(tab.name)}
              style={[
                styles.tabButton,
                isFocused && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              activeOpacity={0.7}>
              <Ionicons name={tab.icon} size={20} color={textColor} />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: textColor,
                  },
                ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 9999, // Very rounded pill shape
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 16,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 9999, // Very rounded for individual buttons
    gap: 8,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
