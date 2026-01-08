import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';

interface NetworkWarningProps {
  message: string;
}

export const NetworkWarning: React.FC<NetworkWarningProps> = ({ message }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.networkWarning,
        { backgroundColor: theme.colors.error + '20' },
      ]}>
      <MaterialIcons name='wifi-off' size={20} color={theme.colors.error} />
      <Text style={[styles.networkWarningText, { color: theme.colors.error }]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  networkWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  networkWarningText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
