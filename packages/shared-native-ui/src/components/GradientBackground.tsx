import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?:
    | import('react-native').ViewStyle
    | import('react-native').TextStyle
    | import('react-native').ImageStyle;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <LinearGradient
      colors={
        theme.mode === 'dark'
          ? ['#33302c', '#2c2a28', '#282927']
          : ['#F5F3ED', '#D4CFC3', '#ede7d3']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}>
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
