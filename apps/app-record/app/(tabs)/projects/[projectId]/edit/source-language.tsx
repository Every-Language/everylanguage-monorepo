import React, { useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '@/shared/hooks';
import { LanguageSelector } from '@/features/projects/components';

/**
 * Select Source Language Screen (Edit)
 *
 * Route screen wrapper for selecting source language when editing a project.
 * Thin wrapper that handles navigation and delegates to LanguageSelector component.
 */
export default function SelectSourceLanguageScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = params.projectId || '';
  const { t } = useTranslation();

  const handleBack = useCallback((): void => {
    router.back();
  }, [router]);

  const handleLanguageSelect = useCallback(
    (language: { entity_id: string; entity_name: string }): void => {
      router.push({
        pathname: `/(tabs)/projects/[projectId]/edit/language-info`,
        params: {
          projectId,
          languageId: language.entity_id,
          languageName: language.entity_name,
          type: 'source',
        },
      });
    },
    [router, projectId]
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
