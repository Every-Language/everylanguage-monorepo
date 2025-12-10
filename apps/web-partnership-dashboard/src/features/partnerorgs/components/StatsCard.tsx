import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { CountUp } from './CountUp';

export interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  animated?: boolean;
  viewAllHref?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  animated = false,
  viewAllHref,
}) => {
  return (
    <Card className='border border-neutral-200 dark:border-neutral-800'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-sm text-neutral-500'>{title}</CardTitle>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className='text-sm text-accent-600 hover:text-accent-700 dark:text-primary-400 dark:hover:text-primary-300'>
              View all →
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className='text-3xl font-bold tracking-tight'>
          {animated && typeof value === 'number' ? (
            <CountUp value={value} />
          ) : (
            value
          )}
        </div>
        {subtitle && (
          <div className='text-xs text-neutral-500 mt-1'>{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
};
