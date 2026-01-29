import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/shared/hooks';
import { RegionSelector } from '@/features/projects/components';

/**
 * Select Region Screen
 *
 * Route screen wrapper for selecting region when creating a project.
 * Thin wrapper that handles navigation and delegates to RegionSelector component.
 */
export default function SelectRegionScreen(): React.JSX.Element {
  const router = useRouter();
  const { t } = useTranslation();

  const handleBack = useCallback((): void => {
    router.back();
  }, [router]);

  const handleRegionSelect = useCallback(
    (region: { region_id: string; region_name: string }): void => {
      router.push({
        pathname: '/modals/create-project/region-info',
        params: {
          regionId: region.region_id,
          regionName: region.region_name,
        },
      });
    },
    [router]
  );

  return (
    <RegionSelector
      title={t('projects.create.selectRegion') || 'Select Region'}
      onBack={handleBack}
      onRegionSelect={handleRegionSelect}
    />
  );
}
