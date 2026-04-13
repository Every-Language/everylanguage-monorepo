import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/shared/hooks';
import { LanguageSelector } from '@/features/projects/components';

/**
 * Select Source Language Screen
 *
 * Route screen wrapper for selecting source language when creating a project.
 * Thin wrapper that handles navigation and delegates to LanguageSelector component.
 */
export default function SelectSourceLanguageScreen(): React.JSX.Element {
  const router = useRouter();
  const { t } = useTranslation();

  const handleBack = useCallback((): void => {
    router.back();
  }, [router]);

  const handleLanguageSelect = useCallback(
    (language: { entity_id: string; entity_name: string }): void => {
      router.push({
        pathname: '/modals/create-project/language-info',
        params: {
          languageId: language.entity_id,
          languageName: language.entity_name,
          type: 'source',
        },
      });
    },
    [router]
  );

  return (
    <LanguageSelector
      title={
        t('projects.create.selectSourceLanguage') || 'Select Source Language'
      }
      onBack={handleBack}
      onLanguageSelect={handleLanguageSelect}
    />
  );
}
