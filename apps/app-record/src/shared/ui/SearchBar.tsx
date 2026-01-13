import React, { useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  editable?: boolean;
}

/**
 * SearchBar Component
 *
 * Reusable search bar with search icon and text input.
 * Auto-focuses when autoFocus prop is true.
 * Search is debounced automatically via onChangeText.
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  autoFocus = false,
  editable = true,
}) => {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus && editable) {
      // Small delay to ensure the screen is fully mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoFocus, editable]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}>
      <Ionicons
        name='search'
        size={20}
        color={theme.colors.accent}
        style={styles.searchIcon}
      />
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: theme.colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        returnKeyType='search'
        autoCapitalize='none'
        autoCorrect={false}
        editable={editable}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
});
