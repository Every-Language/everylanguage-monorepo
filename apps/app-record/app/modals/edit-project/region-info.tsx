import React, { useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { RegionInfo } from '@/features/projects/components';
import { useEditProjectStore } from '@/features/projects/store/editProjectStore';

/**
 * Region Info Screen (Edit)
 *
 * Route screen wrapper for displaying region information when editing a project.
 * Thin wrapper that handles navigation and delegates to RegionInfo component.
 */
export default function RegionInfoScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{
    projectId: string;
    regionId: string;
    regionName: string;
    fromView?: string;
  }>();
  const { setRegion } = useEditProjectStore();

  const handleBack = useCallback((): void => {
    router.back();
  }, [router]);

  const handleSelect = useCallback(
    (regionId: string, regionName: string): void => {
      setRegion(regionId, regionName);
      // If coming from "View" menu, single pop. Otherwise double pop (from search screen)
      if (params.fromView === 'true') {
        router.back();
      } else {
        router.back();
        router.back();
      }
    },
    [params.fromView, router, setRegion]
  );

  return (
    <RegionInfo
      regionId={params.regionId || ''}
      regionName={params.regionName || ''}
      fromView={params.fromView === 'true'}
      onBack={handleBack}
      onSelect={handleSelect}
    />
  );
}
