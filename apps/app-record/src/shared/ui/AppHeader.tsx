import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';

export interface AppHeaderButton {
  label?: string;
  icon?: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}

export interface AppHeaderProps {
  title: string;
  leftButton?: AppHeaderButton;
  rightButtons?: AppHeaderButton[];
}

/**
 * Global App Header Component
 *
 * Provides consistent header styling across the app with:
 * - Optional left button (typically back button)
 * - Title text
 * - Optional right buttons (typically menu or actions)
 *
 * Includes safe area handling for proper display on all devices.
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  leftButton,
  rightButtons = [],
}) => {
  const { theme } = useTheme();

  const content = (
    <View style={styles.content}>
      {/* Left Button */}
      <View style={styles.leftSection}>
        {leftButton && (
          <TouchableOpacity
            style={[
              styles.backButton,
              leftButton.disabled && styles.buttonDisabled,
            ]}
            onPress={leftButton.onPress}
            disabled={leftButton.disabled}>
            {leftButton.icon || (
              <Ionicons
                name='chevron-back-circle'
                size={32}
                color={theme.colors.accent}
              />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Title */}
      <View style={styles.centerSection}>
        <Text
          style={[styles.title, { color: theme.colors.text }]}
          numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Right Buttons */}
      <View style={styles.rightSection}>
        {rightButtons.map((button, index) => {
          const isIconOnly = !!button.icon && !button.label;
          return (
            <TouchableOpacity
              key={index}
              style={[
                isIconOnly ? styles.iconButton : styles.button,
                button.disabled && styles.buttonDisabled,
              ]}
              onPress={button.onPress}
              disabled={button.disabled}>
              {button.icon || (
                <Text
                  style={[styles.buttonText, { color: theme.colors.accent }]}>
                  {button.label || 'Action'}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View
        style={[
          styles.headerContainer,
          {
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}>
        {content}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    zIndex: 1000,
  },
  headerContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 16,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    padding: 0,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 17,
  },
  backButton: {
    padding: 0,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
