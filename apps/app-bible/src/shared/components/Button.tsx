import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import {
  getButtonStyle,
  getShadowStyle,
} from '@everylanguage/shared-native-ui';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
  icon,
  iconPosition = 'left',
}: ButtonProps) {
  const { theme } = useTheme();

  const buttonStyle = getButtonStyle(theme, variant);
  const shadowStyle = variant === 'primary' ? getShadowStyle(theme, 2) : {};

  const sizeStyles = {
    sm: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    md: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    lg: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
    },
  };

  const textSizeStyles = {
    sm: {
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    md: {
      fontSize: theme.typography.fontSize.md,
      lineHeight: theme.typography.lineHeight.md,
    },
    lg: {
      fontSize: theme.typography.fontSize.lg,
      lineHeight: theme.typography.lineHeight.lg,
    },
  };

  const getTextColor = () => {
    if (disabled) {
      return theme.colors.interactiveDisabled;
    }

    switch (variant) {
      case 'primary':
        return theme.colors.textInverse;
      case 'outline':
        return theme.colors.interactive;
      case 'ghost':
        return theme.colors.interactive;
      default:
        return theme.colors.text;
    }
  };

  const combinedButtonStyle = [
    buttonStyle,
    sizeStyles[size],
    shadowStyle,
    fullWidth && { width: '100%' as const },
    disabled && { opacity: 0.6 },
    style,
  ];

  const combinedTextStyle = [
    {
      color: getTextColor(),
      fontFamily: theme.typography.fontFamily.medium,
      fontWeight: '600' as const,
    },
    textSizeStyles[size],
    textStyle,
  ];

  const iconContainerStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const iconLeftStyle = {
    marginRight: 8,
  };

  const iconRightStyle = {
    marginLeft: 8,
  };

  return (
    <TouchableOpacity
      style={combinedButtonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator color={getTextColor()} size='small' />
      ) : (
        <View style={iconContainerStyle}>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={16}
              color={getTextColor()}
              style={iconLeftStyle}
            />
          )}
          <Text style={combinedTextStyle}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={16}
              color={getTextColor()}
              style={iconRightStyle}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
