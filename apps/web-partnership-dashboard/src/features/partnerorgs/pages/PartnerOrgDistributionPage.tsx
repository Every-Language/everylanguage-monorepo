'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { usePartnerOrgProjects } from '../api/usePartnerOrgProjects';
import { useProjectDistribution } from '../api/useProjectDistribution';
import { MapShell } from '@/features/map/components/MapShell';
import { ProjectDistributionHeatmapLayers } from '../components/ProjectDistributionHeatmapLayers';
import { MapSkeleton } from '@/shared/components/ui/Skeletons';
import { createProjectColorMap } from '../utils/colors';
import type { PartnerOrgProject } from '../types';

export const PartnerOrgDistributionPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();

  const { data: projects, isLoading: projectsLoading } = usePartnerOrgProjects(
    orgId!
  );
  const { data: distributionData, isLoading: distributionLoading } =
    useProjectDistribution('all', orgId);

  const [enabledProjects, setEnabledProjects] = React.useState<Set<string>>(
    new Set()
  );

  // Initialize all projects as enabled
  React.useEffect(() => {
    if (projects) {
      const uniqueProjectIds: string[] = Array.from(
        new Set(projects.map((p: PartnerOrgProject) => p.project_id))
      );
      setEnabledProjects(new Set(uniqueProjectIds));
    }
  }, [projects]);

  // Get unique projects
  const uniqueProjects = React.useMemo(() => {
    if (!projects) return [];
    const seen = new Map<string, (typeof projects)[0]>();
    for (const project of projects) {
      if (!seen.has(project.project_id)) {
        seen.set(project.project_id, project);
      }
    }
    return Array.from(seen.values());
  }, [projects]);

  // Generate distinct colors for each project
  const projectColors = React.useMemo(
    () => createProjectColorMap(uniqueProjects, p => p.project_id),
    [uniqueProjects]
  );

  // Show skeleton while loading projects
  if (projectsLoading) {
    return (
      <div className='space-y-6'>
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle>Distribution Map</CardTitle>
          </CardHeader>
          <CardContent>
            <MapSkeleton height='600px' />
          </CardContent>
        </Card>
      </div>
    );
  }

  const toggleProject = (projectId: string) => {
    setEnabledProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  return (
    <div className='space-y-6'>
      {/* Project Filters */}
      {uniqueProjects.length > 0 && (
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle>Project Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex flex-wrap gap-2'>
              {uniqueProjects.map(project => {
                const isEnabled = enabledProjects.has(project.project_id);
                const color = projectColors.get(project.project_id);

                return (
                  <button
                    key={project.project_id}
                    onClick={() => toggleProject(project.project_id)}
                    className={`px-3 py-1.5 rounded-md text-sm border-2 transition-colors ${
                      isEnabled
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300'
                        : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                    style={
                      isEnabled
                        ? {
                            borderColor: color,
                            backgroundColor: `${color}20`,
                            color: color,
                          }
                        : undefined
                    }>
                    <span
                      className='inline-block w-3 h-3 rounded-full mr-2'
                      style={{ backgroundColor: color }}
                    />
                    {project.language_name}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribution Map */}
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardHeader>
          <CardTitle>Distribution Map</CardTitle>
        </CardHeader>
        <CardContent>
          {distributionLoading ? (
            <MapSkeleton height='600px' />
          ) : (
            <div className='h-[600px] rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800'>
              {distributionData?.heatmap &&
              Array.isArray(distributionData.heatmap) &&
              distributionData.heatmap.length > 0 ? (
                <MapShell
                  countriesEnabled={false}
                  padding={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                  <ProjectDistributionHeatmapLayers
                    enabledProjectIds={enabledProjects}
                    projects={uniqueProjects}
                    projectColors={projectColors}
                    heatmapData={distributionData.heatmap.map(point => ({
                      language_entity_id: point.language_entity_id,
                      grid: {
                        type: 'Point',
                        coordinates: [point.longitude, point.latitude],
                      },
                      event_count: point.listen_count,
                      last_event_at: null,
                    }))}
                  />
                </MapShell>
              ) : (
                <div className='h-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center'>
                  <div className='text-center text-neutral-500'>
                    <div className='text-lg font-semibold mb-2'>
                      No distribution data available
                    </div>
                    <div className='text-sm'>
                      Heatmap data will appear here once listening data is
                      available
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
