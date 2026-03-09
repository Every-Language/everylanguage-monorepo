import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import { useTheme, useTranslation } from '@/shared/hooks';

export interface RegionSelectionFieldProps {
  selectedRegionName: string | null;
  onSelect: () => void;
  onView: () => void;
  disabled?: boolean;
}

/**
 * Region Selection Field Component
 *
 * Component for selecting/viewing project region.
 */
export const RegionSelectionField: React.FC<RegionSelectionFieldProps> = ({
  selectedRegionName,
  onSelect,
  onView,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const menuActions: MenuAction[] = useMemo(
    () => [
      { id: 'view', title: 'View Region' },
      { id: 'change', title: 'Change Region' },
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
      <Text style={[styles.label, { color: theme.colors.text }]}>
        {t('projects.create.region') || 'Region'}
      </Text>
      {selectedRegionName ? (
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
                {selectedRegionName}
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
              {t('projects.create.selectRegion') || 'Select Region'}
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
