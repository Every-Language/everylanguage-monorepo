import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import type { Theme } from '@everylanguage/shared-native-ui';

interface ChapterVersesLoadingProps {
  theme?: Theme;
}

export const ChapterVersesLoading: React.FC<ChapterVersesLoadingProps> = ({
  theme: propTheme,
}) => {
  const { theme: defaultTheme } = useTheme();
  const { t } = useLocalization();
  const theme = propTheme || defaultTheme;

  const styles = StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      minHeight: 400,
    },
    loadingText: {
      fontSize: 16,
      marginTop: 16,
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
  });

  return (
    <View style={styles.loadingContainer}>
      <MaterialIcons
        name='hourglass-empty'
        size={48}
        color={theme.colors.textSecondary}
      />
      <Text style={styles.loadingText}>{t('verses.loading')}</Text>
    </View>
  );
};
