import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TopBar } from '@/shared/components/TopBar';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';
import { BibleContainer } from '../components/BibleContainer';

export const BibleTabContainer: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp>();

  return (
    <View style={styles.container}>
      <TopBar
        onMenuPress={() =>
          navigation.navigate('MenuModal', {
            screen: 'Menu',
          })
        }
        onSearchPress={() => navigation.navigate('SearchModal')}
        onQuickSelectionPress={() => navigation.navigate('QuickSelectionModal')}
      />
      <View style={styles.content}>
        <BibleContainer />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});
