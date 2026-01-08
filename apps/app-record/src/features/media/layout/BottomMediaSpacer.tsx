import React from 'react';
import { View } from 'react-native';
import { useMediaBottomInset } from './useMediaBottomInset';

export const BottomMediaSpacer: React.FC = () => {
  const inset = useMediaBottomInset();
  if (inset === 0) return null;
  return <View style={{ height: inset }} />;
};
