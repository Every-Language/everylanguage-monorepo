import React, { useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LanguageInfo } from '@/features/projects/components';
import { useCreateProjectStore } from '@/features/projects/store/createProjectStore';

/**
 * Language Info Screen
 *
 * Route screen wrapper for displaying language information when creating a project.
 * Thin wrapper that handles navigation and delegates to LanguageInfo component.
 */
export default function LanguageInfoScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{
    languageId: string;
    languageName: string;
    type: 'source' | 'target';
    fromView?: string;
  }>();
  const { setSourceLanguage, setTargetLanguage } = useCreateProjectStore();

  const handleBack = useCallback((): void => {
    router.back();
  }, [router]);

  const handleSelect = useCallback(
    (languageId: string, languageName: string): void => {
      if (params.type === 'source') {
        setSourceLanguage(languageId, languageName);
      } else {
        setTargetLanguage(languageId, languageName);
      }

      // If coming from "View" menu, single pop. Otherwise double pop (from search screen)
      if (params.fromView === 'true') {
        router.back();
      } else {
        router.back();
        router.back();
      }
    },
    [params.type, params.fromView, router, setSourceLanguage, setTargetLanguage]
  );

  return (
    <LanguageInfo
      languageId={params.languageId || ''}
      languageName={params.languageName || ''}
      type={params.type || 'source'}
      fromView={params.fromView === 'true'}
      onBack={handleBack}
      onSelect={handleSelect}
    />
  );
}
