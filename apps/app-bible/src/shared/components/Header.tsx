import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import type { Theme } from '@everylanguage/shared-native-ui';

export interface HeaderProps {
  onBackPress: () => void;
  title?: string;
  testID?: string;
  transparent?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onBackPress,
  title,
  testID,
  transparent = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, transparent);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container} testID={testID}>
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
            <MaterialIcons
              name='chevron-left'
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>

          {/* Title */}
          {title && (
            <View style={styles.titleContainer}>
              <Text style={styles.titleText} numberOfLines={1}>
                {title}
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme, transparent: boolean = false) => {
  const backgroundColor = transparent ? 'transparent' : theme.colors.background;

  return StyleSheet.create({
    /* eslint-disable */
    safeArea: {
      backgroundColor,
      zIndex: 1000,
    },
    container: {
      height: 60,
      backgroundColor,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    titleContainer: {
      flex: 1,
      alignItems: 'center',
      marginRight: 52, // Balance the back button space
    },
    titleText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
  });
};
