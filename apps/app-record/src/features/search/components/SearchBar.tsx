import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  loading?: boolean;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  loading = false,
  placeholder,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 16,
      marginVertical: 8,
    },
    input: {
      flex: 1,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text,
      paddingVertical: 0,
    },
    clearButton: {
      padding: 4,
      marginLeft: 8,
    },
    loadingContainer: {
      padding: 4,
      marginLeft: 8,
    },
  });

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || t('search.placeholder')}
        placeholderTextColor={theme.colors.textSecondary}
        autoFocus
        returnKeyType='search'
        clearButtonMode='never'
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='small' color={theme.colors.primary} />
        </View>
      ) : value.length > 0 ? (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={onClear}
          activeOpacity={0.7}>
          <Ionicons
            name='close-circle'
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
