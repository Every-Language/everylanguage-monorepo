import type { LanguageFundingStatus, RegionFundingStatus } from '@/types';

interface FundingStatusBadgeProps {
  status: LanguageFundingStatus | RegionFundingStatus | null | undefined;
  className?: string;
}

export function FundingStatusBadge({
  status,
  className = '',
}: FundingStatusBadgeProps) {
  if (!status) {
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 ${className}`}>
        —
      </span>
    );
  }

  const statusConfig: Record<
    LanguageFundingStatus | RegionFundingStatus,
    { label: string; bgColor: string; textColor: string }
  > = {
    draft: {
      label: 'Draft',
      bgColor: 'bg-neutral-100 dark:bg-neutral-800',
      textColor: 'text-neutral-600 dark:text-neutral-400',
    },
    available: {
      label: 'Available',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-800 dark:text-green-300',
    },
    in_progress: {
      label: 'In Progress',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-800 dark:text-blue-300',
    },
    funded: {
      label: 'Funded',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      textColor: 'text-purple-800 dark:text-purple-300',
    },
    archived: {
      label: 'Archived',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-800 dark:text-red-300',
    },
    not_started: {
      label: 'Not Started',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      textColor: 'text-gray-600 dark:text-gray-400',
    },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${config.bgColor} ${config.textColor} ${className}`}>
      {config.label}
    </span>
  );
}
