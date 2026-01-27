import React, { useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '@/shared/hooks';
import { LanguageSelector } from '@/features/projects/components';

/**
 * Select Target Language Screen (Edit)
 *
 * Route screen wrapper for selecting target language when editing a project.
 * Thin wrapper that handles navigation and delegates to LanguageSelector component.
 */
export default function SelectTargetLanguageScreen(): React.JSX.Element {
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
        pathname: '/modals/edit-project/language-info',
        params: {
          projectId,
          languageId: language.entity_id,
          languageName: language.entity_name,
          type: 'target',
        },
      });
    },
    [router, projectId]
  );

  return (
    <LanguageSelector
      title={
        t('projects.create.selectTargetLanguage') || 'Select Target Language'
      }
      onBack={handleBack}
      onLanguageSelect={handleLanguageSelect}
    />
  );
}
