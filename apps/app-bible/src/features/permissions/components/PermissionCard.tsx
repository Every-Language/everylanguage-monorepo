import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme, useLocalization } from '@/shared/hooks';
import { PermissionCardProps } from '../types';

export const PermissionCard: React.FC<PermissionCardProps> = ({
  title,
  description,
  granted,
  canAskAgain,
  onRequestPress,
  onSettingsPress,
  permissionType,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const getPermissionIcon = (): keyof typeof MaterialIcons.glyphMap => {
    if (granted) return 'check-circle';
    if (!canAskAgain) return 'cancel';
    return 'radio-button-unchecked';
  };

  const getPermissionIconColor = () => {
    if (granted) return theme.colors.primary; // Changed from success to primary (gold)
    if (!canAskAgain) return theme.colors.error;
    return theme.colors.textSecondary;
  };

  const getPermissionTypeIcon = (): keyof typeof MaterialIcons.glyphMap => {
    switch (permissionType) {
      case 'notifications':
        return 'notifications';
      case 'audio':
        return 'headset';
      case 'storage':
        return 'storage';
      case 'backgroundSync':
        return 'sync';
      case 'location':
        return 'location-on';
      default:
        return 'security';
    }
  };

  return (
    <View
      style={[
        styles.permissionItem,
        {
          backgroundColor: theme.colors.secondary, // Changed to secondary
        },
      ]}>
      <View style={styles.permissionHeader}>
        <MaterialIcons
          name={getPermissionTypeIcon()}
          size={20}
          color={theme.colors.primary}
          style={styles.permissionTypeIcon}
        />
        <View style={styles.permissionInfo}>
          <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
        </View>
        <MaterialIcons
          name={getPermissionIcon()}
          size={20}
          color={getPermissionIconColor()}
        />
      </View>

      <Text
        style={[
          styles.permissionDescription,
          { color: theme.colors.textSecondary },
        ]}>
        {description}
      </Text>

      {!granted && (
        <View style={styles.permissionActions}>
          {canAskAgain ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={onRequestPress}>
              <Text
                style={[
                  styles.actionButtonText,
                  { color: theme.colors.textInverse },
                ]}>
                {t('onboarding.permissions.enable')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.error },
              ]}
              onPress={onSettingsPress}>
              <Text
                style={[
                  styles.actionButtonText,
                  { color: theme.colors.textInverse },
                ]}>
                {t('onboarding.permissions.openSettings')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  permissionItem: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionTypeIcon: {
    marginRight: 12,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  permissionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  permissionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
