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
import { useProjectDistribution } from '../hooks/useProjectDistribution';

export const ProjectDistributionPage: React.FC = () => {
  const { projectId, orgId } = useParams<{
    projectId: string;
    orgId: string;
  }>();
  const { data, isLoading } = useProjectDistribution(projectId || 'all', orgId);

  if (isLoading) {
    return <div className='text-neutral-500'>Loading distribution data...</div>;
  }

  return (
    <div className='space-y-6'>
      {/* Stats row */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-sm text-neutral-500'>
              App Downloads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>
              <CountUp value={data?.totalDownloads || 0} />
            </div>
          </CardContent>
        </Card>
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-sm text-neutral-500'>
              Total Listening Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>
              <CountUp value={data?.totalListeningHours || 0} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap placeholder */}
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardHeader>
          <CardTitle>Distribution Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='h-96 bg-neutral-100 dark:bg-neutral-900 rounded-lg flex items-center justify-center'>
            <div className='text-center text-neutral-500'>
              <div className='text-lg font-semibold mb-2'>
                Heatmap Visualization
              </div>
              <div className='text-sm'>
                {data?.heatmap && data.heatmap.length > 0
                  ? `${data.heatmap.length} location points available`
                  : 'No distribution data available'}
              </div>
              <div className='text-xs mt-2'>
                TODO: Integrate map component with heatmap data
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heatmap data preview (for debugging) */}
      {data?.heatmap && data.heatmap.length > 0 && (
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle>Location Data Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-xs font-mono overflow-auto max-h-64'>
              <pre className='text-neutral-600 dark:text-neutral-400'>
                {JSON.stringify(data.heatmap.slice(0, 5), null, 2)}
              </pre>
              {data.heatmap.length > 5 && (
                <div className='text-neutral-500 mt-2'>
                  ... and {data.heatmap.length - 5} more locations
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProjectDistributionPage;
