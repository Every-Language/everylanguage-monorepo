import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks/useLocalizationFromStore';

interface NoNetworkModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export const NoNetworkModal: React.FC<NoNetworkModalProps> = ({
  visible,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}>
        <View
          style={{
            backgroundColor: theme.colors.background,
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 340,
            alignItems: 'center',
          }}>
          <MaterialIcons
            name='wifi-off'
            size={48}
            color={theme.colors.error || theme.colors.text}
            style={{ marginBottom: 16 }}
          />
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.text,
              marginBottom: 8,
              textAlign: 'center',
            }}>
            {t('network.title')}
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: theme.colors.textSecondary ?? theme.colors.text,
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 22,
            }}>
            {t('network.disconnected')}
          </Text>
          <TouchableOpacity
            onPress={onDismiss}
            style={{
              backgroundColor: theme.colors.primary,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
            }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.colors.background,
              }}>
              {t('common.ok')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
