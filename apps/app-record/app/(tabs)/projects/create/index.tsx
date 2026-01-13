import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { CreateProjectForm } from '@/features/projects/components';
import { useCreateProjectStore } from '@/features/projects/store/createProjectStore';

/**
 * Create Project Form Screen
 *
 * Route screen wrapper for creating a new project.
 * Thin wrapper that handles navigation and delegates to CreateProjectForm component.
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
    router.push('/(tabs)/projects/create/source-language');
  }, [router]);

  const handleViewSourceLanguage = useCallback((): void => {
    if (source_language_id && source_language_name) {
      router.push({
        pathname: '/(tabs)/projects/create/language-info',
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
    router.push('/(tabs)/projects/create/target-language');
  }, [router]);

  const handleViewTargetLanguage = useCallback((): void => {
    if (target_language_id && target_language_name) {
      router.push({
        pathname: '/(tabs)/projects/create/language-info',
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
    router.push('/(tabs)/projects/create/select-region');
  }, [router]);

  const handleViewRegion = useCallback((): void => {
    if (region_id && region_name) {
      router.push({
        pathname: '/(tabs)/projects/create/region-info',
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
