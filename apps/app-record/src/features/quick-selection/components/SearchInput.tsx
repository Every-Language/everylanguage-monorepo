import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric';
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  onClear,
}) => {
  const { theme } = useTheme();

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
  });

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        keyboardType={keyboardType}
        autoCorrect={false}
        autoCapitalize='none'
        returnKeyType='search'
      />
      {value.length > 0 && onClear && (
        <TouchableOpacity onPress={onClear} style={styles.clearButton}>
          <MaterialIcons
            name='clear'
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};
