import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { CreateProjectForm } from '@/features/projects/components';
import { useCreateProjectStore } from '@/features/projects/store/createProjectStore';

/**
 * Create Project Form Screen
 *
 * Root-level modal screen for creating a new project.
 * Renders above tab bar on both iOS and Android.
 */
export default function CreateProjectFormScreen(): React.JSX.Element {
  const router = useRouter();
  const {
    source_language_id,
    source_language_name,
    target_language_id,
    target_language_name,
    region_id,
    region_name,
  } = useCreateProjectStore();

  const handleClose = useCallback((): void => {
    router.back();
  }, [router]);

  const handleSelectSourceLanguage = useCallback((): void => {
    router.push('/modals/create-project/source-language');
  }, [router]);

  const handleViewSourceLanguage = useCallback((): void => {
    if (source_language_id && source_language_name) {
      router.push({
        pathname: '/modals/create-project/language-info',
        params: {
          languageId: source_language_id,
          languageName: source_language_name,
          type: 'source',
          fromView: 'true',
        },
      });
    }
  }, [router, source_language_id, source_language_name]);

  const handleSelectTargetLanguage = useCallback((): void => {
    router.push('/modals/create-project/target-language');
  }, [router]);

  const handleViewTargetLanguage = useCallback((): void => {
    if (target_language_id && target_language_name) {
      router.push({
        pathname: '/modals/create-project/language-info',
        params: {
          languageId: target_language_id,
          languageName: target_language_name,
          type: 'target',
          fromView: 'true',
        },
      });
    }
  }, [router, target_language_id, target_language_name]);

  const handleSelectRegion = useCallback((): void => {
    router.push('/modals/create-project/select-region');
  }, [router]);

  const handleViewRegion = useCallback((): void => {
    if (region_id && region_name) {
      router.push({
        pathname: '/modals/create-project/region-info',
        params: {
          regionId: region_id,
          regionName: region_name,
          fromView: 'true',
        },
      });
    }
  }, [router, region_id, region_name]);

  return (
    <CreateProjectForm
      onClose={handleClose}
      onSelectSourceLanguage={handleSelectSourceLanguage}
      onViewSourceLanguage={handleViewSourceLanguage}
      onSelectTargetLanguage={handleSelectTargetLanguage}
      onViewTargetLanguage={handleViewTargetLanguage}
      onSelectRegion={handleSelectRegion}
      onViewRegion={handleViewRegion}
    />
  );
}
