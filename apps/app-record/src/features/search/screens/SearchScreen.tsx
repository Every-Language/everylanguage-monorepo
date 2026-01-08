import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { SearchModal } from '../components/SearchModal';

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleClose = () => {
    navigation.goBack();
  };

  return <SearchModal visible={true} onClose={handleClose} />;
};
