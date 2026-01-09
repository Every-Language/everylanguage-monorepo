import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { getContrastTextColor } from '../utils/colorUtils';

interface WelcomeCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  backgroundColor: string;
  onPress?: (() => void) | undefined;
  disabled?: boolean;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({
  icon,
  title,
  description,
  backgroundColor,
  onPress,
  disabled = false,
}) => {
  const { theme } = useTheme();

  // Determine text color based on background
  let textColor: string;
  if (backgroundColor === theme.colors.primary) {
    // For primary color, use inverse text
    textColor = theme.colors.textInverse;
  } else if (backgroundColor === theme.colors.secondary) {
    // For secondary color, use regular text
    textColor = theme.colors.text;
  } else if (backgroundColor === theme.colors.surface) {
    textColor = theme.colors.text;
  } else {
    // Fallback to contrast calculation
    textColor = getContrastTextColor(backgroundColor, theme);
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
        },
      ]}>
      <TouchableOpacity
        style={styles.cardTouchable}
        onPress={onPress}
        disabled={disabled}>
        <View style={[styles.cardIcon]}>
          <Ionicons name={icon} size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>
          <Text
            style={[
              styles.cardDescription,
              getCardDescriptionStyle(textColor),
            ]}>
            {description}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const getCardDescriptionStyle = (textColor: string) => ({
  color: textColor,
  opacity: 0.9,
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    width: '100%',
    minHeight: 100,
  },
  cardTouchable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    marginTop: 2,
    flexShrink: 0,
  },

  cardContent: {
    flex: 1,
    paddingTop: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
});
