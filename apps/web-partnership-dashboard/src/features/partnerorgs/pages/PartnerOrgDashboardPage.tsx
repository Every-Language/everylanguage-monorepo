import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { Progress } from '@/shared/components/ui/Progress';
import { CountUp } from '../components/CountUp';
import { usePartnerOrgProjects } from '../hooks/usePartnerOrgProjects';
import { usePendingLanguages } from '../hooks/usePendingLanguages';
import { useProjectProgress } from '../hooks/useProjectProgress';
import { useProjectDistribution } from '../hooks/useProjectDistribution';
import { useProjectFunding } from '../hooks/useProjectFunding';
import { useProjectUpdates } from '../hooks/useProjectUpdates';

const formatCurrency = (cents: number, currencyCode: string = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

export const PartnerOrgDashboardPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();

  // Fetch all data for dashboard overview
  const { data: projects, isLoading: projectsLoading } = usePartnerOrgProjects(
    orgId!
  );
  const { data: pendingLanguages, isLoading: pendingLoading } =
    usePendingLanguages(orgId!);
  const { isLoading: progressLoading } = useProjectProgress('all', orgId);
  const { data: distributionData, isLoading: distributionLoading } =
    useProjectDistribution('all', orgId);
  const { data: fundingData, isLoading: fundingLoading } = useProjectFunding(
    'all',
    orgId
  );
  const { data: updates, isLoading: updatesLoading } = useProjectUpdates(
    'all',
    orgId
  );

  const isLoading =
    projectsLoading ||
    pendingLoading ||
    progressLoading ||
    distributionLoading ||
    fundingLoading ||
    updatesLoading;

  if (isLoading) {
    return <div className='text-neutral-500'>Loading dashboard...</div>;
  }

  const totalProjects = projects?.length || 0;
  const totalPendingLanguages = pendingLanguages?.length || 0;

  // Calculate aggregate funding from balances
  const totalContributions =
    fundingData && 'balances' in fundingData && fundingData.balances
      ? fundingData.balances.reduce(
          (sum: number, b) => sum + b.total_contributions_cents,
          0
        )
      : 0;
  const totalBalance =
    fundingData && 'balances' in fundingData && fundingData.balances
      ? fundingData.balances.reduce(
          (sum: number, b) => sum + b.balance_cents,
          0
        )
      : 0;

  return (
    <div className='space-y-6'>
      {/* Top stats row */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-sm text-neutral-500'>
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>
              <CountUp value={totalProjects} />
            </div>
          </CardContent>
        </Card>
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-sm text-neutral-500'>
              Pending Languages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <div className='text-3xl font-bold tracking-tight'>
                <CountUp value={totalPendingLanguages} />
              </div>
              {totalPendingLanguages > 0 && (
                <Link
                  to={`/partner-org/${orgId}/pending-languages`}
                  className='text-xs text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300'
                >
                  View →
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-sm text-neutral-500'>
              App Downloads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>
              <CountUp value={distributionData?.totalDownloads || 0} />
            </div>
          </CardContent>
        </Card>
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-sm text-neutral-500'>
              Listening Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>
              <CountUp value={distributionData?.totalListeningHours || 0} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funding overview */}
      {totalContributions > 0 && (
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-sm text-neutral-500'>
              Project Balance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center gap-4'>
              <Progress
                variant='circular'
                size='lg'
                value={totalBalance}
                max={totalContributions}
                color={totalBalance > 0 ? 'accent' : 'error'}
                showValue
              />
              <div>
                <div className='text-3xl font-bold tracking-tight'>
                  {formatCurrency(totalBalance)}
                </div>
                <div className='text-xs text-neutral-500 mt-1'>
                  remaining from {formatCurrency(totalContributions)}{' '}
                  contributed
                </div>
                {totalBalance < 0 && (
                  <div className='text-xs text-error-600 dark:text-error-400 mt-1'>
                    ⚠️ Projects are overspent
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects table */}
      {projects && projects.length > 0 && (
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle>Active Projects</CardTitle>
              <div className='text-xs text-neutral-500'>
                Click a project name to view details
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className='overflow-x-auto -mx-2 sm:mx-0'>
              <table className='min-w-full text-sm'>
                <thead>
                  <tr className='text-left text-neutral-500'>
                    <th className='py-2 px-3 sm:px-4'>Language / Project</th>
                    <th className='py-2 px-3 sm:px-4'>Status</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-neutral-200 dark:divide-neutral-800'>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {projects.map((p: any) => (
                    <tr key={p.project_id}>
                      <td className='py-3 px-3 sm:px-4'>
                        <Link
                          to={`/partner-org/${orgId}/project/${p.project_id}/progress`}
                          className='font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300'
                        >
                          {p.language_name}
                        </Link>
                        <div className='text-xs text-neutral-500 mt-1'>
                          {p.project_name}
                        </div>
                      </td>
                      <td className='py-3 px-3 sm:px-4'>
                        <span className='inline-flex items-center px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs capitalize'>
                          {p.sponsorship_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent updates feed */}
      {updates && updates.length > 0 && (
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle>Recent Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
              {updates.slice(0, 6).map(update => {
                const project = Array.isArray(update.project)
                  ? update.project[0]
                  : update.project;
                const languageEntity = project?.language_entity
                  ? Array.isArray(project.language_entity)
                    ? project.language_entity[0]
                    : project.language_entity
                  : null;

                return (
                  <div
                    key={update.id}
                    className='rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-card'
                  >
                    <div className='text-xs text-neutral-500 mb-1'>
                      {formatDate(update.created_at)}
                      {languageEntity && <> • {languageEntity.name}</>}
                    </div>
                    <div className='font-semibold mb-1'>{update.title}</div>
                    <div className='text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2'>
                      {update.body}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PartnerOrgDashboardPage;
