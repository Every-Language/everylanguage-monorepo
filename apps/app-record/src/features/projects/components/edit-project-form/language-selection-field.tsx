import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import { useTheme, useTranslation } from '@/shared/hooks';

export interface LanguageSelectionFieldProps {
  label: string;
  selectedLanguageName: string | null;
  onSelect: () => void;
  onView: () => void;
  disabled?: boolean;
}

/**
 * Language Selection Field Component
 *
 * Reusable component for selecting/viewing languages (source or target).
 */
export const LanguageSelectionField: React.FC<LanguageSelectionFieldProps> = ({
  label,
  selectedLanguageName,
  onSelect,
  onView,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const menuActions: MenuAction[] = useMemo(
    () => [
      { id: 'view', title: 'View Language' },
      { id: 'change', title: 'Change Language' },
    ],
    []
  );

  const handleMenuAction = useCallback(
    ({ nativeEvent }: { nativeEvent: { event: string } }) => {
      if (nativeEvent.event === 'view') {
        onView();
      } else if (nativeEvent.event === 'change') {
        onSelect();
      }
    },
    [onView, onSelect]
  );

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      {selectedLanguageName ? (
        <MenuView actions={menuActions} onPressAction={handleMenuAction}>
          <TouchableOpacity
            style={[
              styles.selectField,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
            disabled={disabled}>
            <View style={styles.selectFieldContent}>
              <Text
                style={[styles.selectFieldText, { color: theme.colors.text }]}
                numberOfLines={1}
                ellipsizeMode='tail'>
                {selectedLanguageName}
              </Text>
            </View>
            <Ionicons
              name='chevron-forward'
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </MenuView>
      ) : (
        <TouchableOpacity
          style={[
            styles.selectField,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
          ]}
          onPress={onSelect}
          disabled={disabled}>
          <View style={styles.selectFieldContent}>
            <Text
              style={[styles.selectFieldText, { color: theme.colors.text }]}>
              {label.includes('Source')
                ? t('projects.create.selectSourceLanguage') ||
                  'Select Source Language'
                : t('projects.create.selectTargetLanguage') ||
                  'Select Target Language'}
            </Text>
          </View>
          <Ionicons
            name='chevron-forward'
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  selectFieldContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectFieldText: {
    fontSize: 17,
  },
});
