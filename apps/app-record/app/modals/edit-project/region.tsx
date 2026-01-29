import React, { useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '@/shared/hooks';
import { RegionSelector } from '@/features/projects/components';

/**
 * Select Region Screen (Edit)
 *
 * Route screen wrapper for selecting region when editing a project.
 * Thin wrapper that handles navigation and delegates to RegionSelector component.
 */
export default function SelectRegionScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = params.projectId || '';
  const { t } = useTranslation();

  const handleBack = useCallback((): void => {
    router.back();
  }, [router]);

  const handleRegionSelect = useCallback(
    (region: { region_id: string; region_name: string }): void => {
      router.push({
        pathname: '/modals/edit-project/region-info',
        params: {
          projectId,
          regionId: region.region_id,
          regionName: region.region_name,
        },
      });
    },
    [router, projectId]
  );

  return (
    <RegionSelector
      title={t('projects.create.selectRegion') || 'Select Region'}
      onBack={handleBack}
      onRegionSelect={handleRegionSelect}
    />
  );
}
