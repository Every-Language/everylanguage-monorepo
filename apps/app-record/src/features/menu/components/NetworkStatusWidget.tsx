import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { useNetwork } from '@/shared/hooks/useNetworkState';
import { NoInternetModal } from '@/shared/components/NoInternetModal';

export interface NetworkStatusWidgetProps {
  onPress?: () => void;
}

export const NetworkStatusWidget: React.FC<NetworkStatusWidgetProps> = ({
  onPress,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const [showNoInternetModal, setShowNoInternetModal] = useState(false);

  const {
    isConnected,
    connectionType,
    isInternetReachable,
    isOnline,
    isChecking,
    checkOnlineCapabilities,
  } = useNetwork();

  const getNetworkStatusInfo = () => {
    // Show checking state during initial load or when actively checking
    if (isChecking) {
      return {
        text: t('network.checking', { defaultValue: 'Checking connection...' }),
        icon: 'sync' as keyof typeof MaterialIcons.glyphMap,
        color: theme.colors.textSecondary,
      };
    }

    // Only show "no connection" if we have confirmed network is unavailable
    if (!isConnected) {
      return {
        text: t('network.disconnected', {
          defaultValue: 'No network connection',
        }),
        icon: 'cloud-off' as keyof typeof MaterialIcons.glyphMap,
        color: theme.colors.error,
      };
    }

    // Only show "no internet" if we have confirmed internet is unavailable
    if (isInternetReachable === false || !isOnline) {
      return {
        text: t('network.noInternet', { defaultValue: 'No internet access' }),
        icon: 'wifi-off' as keyof typeof MaterialIcons.glyphMap,
        color: theme.colors.error,
      };
    }

    // Connected with internet
    switch (connectionType) {
      case 'wifi':
        return {
          text: t('network.wifi', { defaultValue: 'WiFi connected' }),
          icon: 'wifi' as keyof typeof MaterialIcons.glyphMap,
          color: theme.colors.success,
        };
      case 'cellular':
        return {
          text: t('network.mobile', { defaultValue: 'Mobile data connected' }),
          icon: 'signal-cellular-4-bar' as keyof typeof MaterialIcons.glyphMap,
          color: theme.colors.success,
        };
      case 'bluetooth':
        return {
          text: t('network.bluetooth', { defaultValue: 'Bluetooth connected' }),
          icon: 'bluetooth' as keyof typeof MaterialIcons.glyphMap,
          color: theme.colors.success,
        };
      case 'ethernet':
        return {
          text: t('network.ethernet', { defaultValue: 'Ethernet connected' }),
          icon: 'cable' as keyof typeof MaterialIcons.glyphMap,
          color: theme.colors.success,
        };
      default:
        return {
          text: t('network.connected', { defaultValue: 'Network connected' }),
          icon: 'language' as keyof typeof MaterialIcons.glyphMap,
          color: theme.colors.success,
        };
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    // If no internet, show the modal
    if (!isConnected || isInternetReachable === false || !isOnline) {
      setShowNoInternetModal(true);
    } else {
      // If connected, trigger a connectivity check
      checkOnlineCapabilities();
    }
  };

  const handleRetry = async () => {
    await checkOnlineCapabilities();
  };

  const statusInfo = getNetworkStatusInfo();

  return (
    <>
      <TouchableOpacity
        style={[styles.networkCard, { backgroundColor: theme.colors.surface }]}
        onPress={handlePress}
        activeOpacity={0.7}
        testID='network-status-widget'>
        <View style={styles.networkContent}>
          <MaterialIcons
            name={statusInfo.icon}
            size={24}
            color={statusInfo.color}
          />
          <View style={styles.networkInfo}>
            <Text style={[styles.networkTitle, { color: theme.colors.text }]}>
              {t('network.title', { defaultValue: 'Network' })}
            </Text>
            <Text style={[styles.networkSubtext, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
          </View>
        </View>
        <MaterialIcons
          name='chevron-right'
          size={16}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      <NoInternetModal
        visible={showNoInternetModal}
        onRetry={handleRetry}
        onClose={() => setShowNoInternetModal(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  networkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  networkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  networkInfo: {
    flex: 1,
  },
  networkTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  networkSubtext: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
});
