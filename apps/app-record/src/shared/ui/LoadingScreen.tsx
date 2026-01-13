import React from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface LoadingScreenProps {
  message?: string;
}

/**
 * Branded loading screen component
 * Displays app icon and "OMT Record" title with brand styling
 * - "OMT" in text color
 * - "Record" in accent color (gold)
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* App Icon */}
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('../../../assets/icon.png')}
        style={styles.icon}
        resizeMode='contain'
      />

      {/* App Title with Brand Styling */}
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]}>OMT</Text>
        <Text style={[styles.title, { color: theme.colors.accent }]}>
          {' '}
          Record
        </Text>
      </View>

      {/* Loading Indicator */}
      <ActivityIndicator
        size='large'
        color={theme.colors.accent}
        style={styles.spinner}
      />

      {/* Loading Message */}
      <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    width: 120,
    height: 120,
    marginBottom: 32,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
});
