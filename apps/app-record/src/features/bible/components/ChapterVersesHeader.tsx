import React from 'react';
import { Header } from '@/shared/components';
import { useChapterVersesLogic } from '../hooks/useChapterVersesLogic';

export const ChapterVersesHeader: React.FC = () => {
  // Get data directly from hooks - no props needed!
  const { headerTitle, handleBack } = useChapterVersesLogic();

  return (
    <Header
      onBackPress={handleBack}
      title={headerTitle}
      testID='verses-screen-header'
      transparent={true}
    />
  );
};
