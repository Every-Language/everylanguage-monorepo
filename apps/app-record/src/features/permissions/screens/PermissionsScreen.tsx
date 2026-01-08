import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useLocalization } from '@/shared/hooks';
import { usePermissions } from '../hooks/usePermissions';
import { PermissionCard } from '../components/PermissionCard';
import { OnboardingHeader } from '../../onboarding/components';
import { logger } from '@/shared/utils/logger';
import { PermissionsScreenProps } from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export const PermissionsScreen: React.FC<PermissionsScreenProps> = ({
  onComplete,
  onSkip: _onSkip,
  onBack,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const {
    permissions,
    isLoading,
    requestAllPermissions,
    requestNotificationPermissions,
    requestLocationPermissions,
    areCriticalPermissionsGranted,
    showPermissionExplanation,
    openAppSettings,
  } = usePermissions();

  const [isRequesting, setIsRequesting] = useState(false);

  // Auto-advance when already granted
  useEffect(() => {
    if (!isLoading && areCriticalPermissionsGranted()) {
      onComplete();
    }
  }, [isLoading, areCriticalPermissionsGranted, onComplete]);

  const getPermissionDetails = (type: keyof typeof permissions) => {
    return {
      title: t(`onboarding.permissions.permissions.${type}.title`),
      description: t(`onboarding.permissions.permissions.${type}.description`),
    };
  };

  const handleRequestPermission = async (type: keyof typeof permissions) => {
    try {
      switch (type) {
        case 'notifications':
          await requestNotificationPermissions();
          break;
        case 'location':
          await requestLocationPermissions();
          break;
        default:
          showPermissionExplanation(type);
          break;
      }
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        `Failed to request ${type} permission:`,
        error
      );
    }
  };

  const handleRequestAllPermissions = async () => {
    try {
      setIsRequesting(true);
      await requestAllPermissions();
      await requestLocationPermissions();

      if (areCriticalPermissionsGranted()) {
        onComplete();
      } else {
        Alert.alert(
          t('onboarding.permissions.alerts.somePermissionsDenied.title'),
          t('onboarding.permissions.alerts.somePermissionsDenied.message'),
          [
            { text: t('common.ok'), style: 'default' },
            {
              text: t('onboarding.permissions.openSettings'),
              onPress: openAppSettings,
            },
          ]
        );
      }
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Failed to request permissions:', error);
      Alert.alert(
        t('onboarding.permissions.alerts.error.title'),
        t('onboarding.permissions.alerts.error.message'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsRequesting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            {t('onboarding.permissions.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleDisabledButtonPress = () => {
    Alert.alert(
      t('onboarding.permissions.title'),
      t('onboarding.permissions.requestAllDisabledTooltip')
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OnboardingHeader
        title={t('onboarding.permissions.title')}
        subtitle={t('onboarding.permissions.subtitle')}
        showBackButton={!!onBack}
        onBack={onBack}
        showControls={true}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.permissionsList}>
          {Object.entries(permissions).map(([type, permission]) => {
            const details = getPermissionDetails(
              type as keyof typeof permissions
            );
            return (
              <PermissionCard
                key={type}
                title={details.title}
                description={details.description}
                granted={permission.granted}
                canAskAgain={permission.canAskAgain}
                onRequestPress={() =>
                  handleRequestPermission(type as keyof typeof permissions)
                }
                onSettingsPress={openAppSettings}
                permissionType={
                  type as
                    | 'notifications'
                    | 'audio'
                    | 'storage'
                    | 'backgroundSync'
                    | 'location'
                }
              />
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[styles.footer, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          style={[
            styles.requestAllButton,
            { backgroundColor: theme.colors.primary },
            isRequesting && styles.disabledButton,
          ]}
          onPress={
            isRequesting
              ? handleDisabledButtonPress
              : areCriticalPermissionsGranted()
                ? onComplete
                : handleRequestAllPermissions
          }>
          <Text
            style={[
              styles.requestAllButtonText,
              { color: theme.colors.textInverse },
            ]}>
            {isRequesting
              ? t('onboarding.permissions.requesting')
              : areCriticalPermissionsGranted()
                ? t('common.continue')
                : t('onboarding.permissions.requestAll')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  permissionsList: {
    marginTop: 20,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    padding: 20,
    paddingTop: 12,
  },
  requestAllButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  requestAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
