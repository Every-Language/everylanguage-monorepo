import React, { useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { EditProjectForm } from '@/features/projects/components';
import { useEditProjectStore } from '@/features/projects/store/editProjectStore';

/**
 * Edit Project Form Screen
 *
 * Root-level modal screen for editing an existing project.
 * Renders above tab bar on both iOS and Android.
 */
export default function EditProjectFormScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = params.projectId || '';
  const {
    source_language_id,
    source_language_name,
    target_language_id,
    target_language_name,
    region_id,
    region_name,
  } = useEditProjectStore();

  const handleClose = useCallback((): void => {
    router.back();
  }, [router]);

  const handleDeleteSuccess = useCallback((): void => {
    router.replace('/(tabs)/projects');
  }, [router]);

  const handleSelectSourceLanguage = useCallback((): void => {
    router.push({
      pathname: '/modals/edit-project/source-language',
      params: { projectId },
    });
  }, [router, projectId]);

  const handleViewSourceLanguage = useCallback((): void => {
    if (source_language_id && source_language_name) {
      router.push({
        pathname: '/modals/edit-project/language-info',
        params: {
          projectId,
          languageId: source_language_id,
          languageName: source_language_name,
          type: 'source',
          fromView: 'true',
        },
      });
    }
  }, [router, projectId, source_language_id, source_language_name]);

  const handleSelectTargetLanguage = useCallback((): void => {
    router.push({
      pathname: '/modals/edit-project/target-language',
      params: { projectId },
    });
  }, [router, projectId]);

  const handleViewTargetLanguage = useCallback((): void => {
    if (target_language_id && target_language_name) {
      router.push({
        pathname: '/modals/edit-project/language-info',
        params: {
          projectId,
          languageId: target_language_id,
          languageName: target_language_name,
          type: 'target',
          fromView: 'true',
        },
      });
    }
  }, [router, projectId, target_language_id, target_language_name]);

  const handleSelectRegion = useCallback((): void => {
    router.push({
      pathname: '/modals/edit-project/region',
      params: { projectId },
    });
  }, [router, projectId]);

  const handleViewRegion = useCallback((): void => {
    if (region_id && region_name) {
      router.push({
        pathname: '/modals/edit-project/region-info',
        params: {
          projectId,
          regionId: region_id,
          regionName: region_name,
          fromView: 'true',
        },
      });
    }
  }, [router, projectId, region_id, region_name]);

  return (
    <EditProjectForm
      projectId={projectId}
      onClose={handleClose}
      onDeleteSuccess={handleDeleteSuccess}
      onSelectSourceLanguage={handleSelectSourceLanguage}
      onViewSourceLanguage={handleViewSourceLanguage}
      onSelectTargetLanguage={handleSelectTargetLanguage}
      onViewTargetLanguage={handleViewTargetLanguage}
      onSelectRegion={handleSelectRegion}
      onViewRegion={handleViewRegion}
    />
  );
}
