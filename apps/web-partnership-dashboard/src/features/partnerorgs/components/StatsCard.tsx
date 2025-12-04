import React from 'react';
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
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  animated = false,
}) => {
  return (
    <Card className='border border-neutral-200 dark:border-neutral-800'>
      <CardHeader>
        <CardTitle className='text-sm text-neutral-500'>{title}</CardTitle>
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
