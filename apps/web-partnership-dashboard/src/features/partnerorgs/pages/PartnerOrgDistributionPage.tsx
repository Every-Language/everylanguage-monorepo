'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { CountUp } from '../components/CountUp';
import { usePartnerOrgProjects } from '../hooks/usePartnerOrgProjects';
import { useProjectDistribution } from '../hooks/useProjectDistribution';
import { MapShell } from '@/features/map/components/MapShell';
import { ProjectDistributionHeatmapLayers } from '../components/ProjectDistributionHeatmapLayers';
import {
  StatsCardSkeleton,
  MapSkeleton,
} from '@/shared/components/ui/Skeletons';

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
      const uniqueProjectIds = [...new Set(projects.map(p => p.project_id))];
      setEnabledProjects(new Set(uniqueProjectIds));
    }
  }, [projects]);

  // Get unique projects - must be called before early return
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

  // Generate distinct colors for each project - must be called before early return
  const projectColors = React.useMemo(() => {
    const colors = [
      '#3b82f6', // blue
      '#ef4444', // red
      '#10b981', // green
      '#f59e0b', // amber
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
    ];
    const colorMap = new Map<string, string>();
    uniqueProjects.forEach((project, idx) => {
      colorMap.set(project.project_id, colors[idx % colors.length]);
    });
    return colorMap;
  }, [uniqueProjects]);

  // Show skeleton while loading projects
  if (projectsLoading) {
    return (
      <div className='space-y-6'>
        <StatsCardSkeleton count={2} />
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
                    }
                  >
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

      {/* Statistics */}
      {distributionLoading ? (
        <StatsCardSkeleton count={2} />
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <Card className='border border-neutral-200 dark:border-neutral-800'>
            <CardHeader>
              <CardTitle className='text-sm text-neutral-500'>
                App Downloads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold tracking-tight'>
                <CountUp
                  value={(distributionData as any)?.totalDownloads || 0}
                />
              </div>
              <div className='text-xs text-neutral-500 mt-1'>
                {enabledProjects.size > 0
                  ? `${enabledProjects.size} project${enabledProjects.size > 1 ? 's' : ''} selected`
                  : 'No projects selected'}
              </div>
            </CardContent>
          </Card>
          <Card className='border border-neutral-200 dark:border-neutral-800'>
            <CardHeader>
              <CardTitle className='text-sm text-neutral-500'>
                Total Minutes Listened
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold tracking-tight'>
                <CountUp
                  value={
                    ((distributionData as any)?.totalListeningHours || 0) * 60
                  }
                />
              </div>
              <div className='text-xs text-neutral-500 mt-1'>
                {Math.round(
                  (distributionData as any)?.totalListeningHours || 0
                )}{' '}
                hours
              </div>
            </CardContent>
          </Card>
        </div>
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
              {(distributionData as any)?.heatmap &&
              Array.isArray((distributionData as any).heatmap) &&
              (distributionData as any).heatmap.length > 0 ? (
                <MapShell
                  countriesEnabled={false}
                  padding={{ top: 0, bottom: 0, left: 0, right: 0 }}
                >
                  <ProjectDistributionHeatmapLayers
                    enabledProjectIds={enabledProjects}
                    projects={uniqueProjects}
                    projectColors={projectColors}
                    heatmapData={(distributionData as any).heatmap}
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
