import React, { useMemo } from 'react';
import { useHasJPCountryData } from '../hooks/useJoshuaProject';
import { useJPCountryDataCache } from '../hooks/useJPCountryDataCache';
import {
  UsersIcon,
  GlobeAltIcon,
  LanguageIcon,
} from '@heroicons/react/24/outline';
import { formatPopulationCompact } from '../utils/formatPopulation';

type JPCountryStatsSectionProps = {
  entityId: string;
};

/**
 * Country Stats Section displays overview statistics for a country
 * from Joshua Project (only for regions at country level)
 */
export const JPCountryStatsSection: React.FC<JPCountryStatsSectionProps> = ({
  entityId,
}) => {
  const hasCountryData = useHasJPCountryData(entityId);
  const { countryStats, isLoading, error } = useJPCountryDataCache(entityId);

  // Religious breakdown data - must be called before early returns
  const religiousData = useMemo(() => {
    if (!countryStats) return [];
    return [
      {
        name: 'Christian',
        percent: countryStats.PercentChristianPC,
        population: countryStats.PCChristianity,
        color: '#3b82f6', // blue
      },
      {
        name: 'Islam',
        percent: countryStats.PercentIslam,
        population: countryStats.PCIslam,
        color: '#10b981', // green
      },
      {
        name: 'Buddhism',
        percent: countryStats.PercentBuddhism,
        population: countryStats.PCBuddhism,
        color: '#f59e0b', // amber
      },
      {
        name: 'Hinduism',
        percent: countryStats.PercentHinduism,
        population: countryStats.PCHinduism,
        color: '#ef4444', // red
      },
      {
        name: 'Ethnic Religions',
        percent: countryStats.PercentEthnicReligions,
        population: countryStats.PCEthnicReligions,
        color: '#8b5cf6', // purple
      },
      {
        name: 'Non-Religious',
        percent: countryStats.PercentNonReligious,
        population: countryStats.PCNonReligious,
        color: '#6b7280', // gray
      },
      {
        name: 'Other',
        percent: countryStats.PercentOtherSmall,
        population: countryStats.PCOtherSmall,
        color: '#ec4899', // pink
      },
    ]
      .filter(item => item.percent > 0)
      .sort((a, b) => b.percent - a.percent);
  }, [countryStats]);

  // Calculate pie chart segments - must be called before early returns
  const pieChartData = useMemo(() => {
    if (religiousData.length === 0) return [];
    const total = religiousData.reduce((sum, item) => sum + item.percent, 0);
    if (total === 0) return [];

    let currentAngle = -90; // Start at top
    return religiousData.map(item => {
      const angle = (item.percent / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      const x1 = 50 + 50 * Math.cos((startAngle * Math.PI) / 180);
      const y1 = 50 + 50 * Math.sin((startAngle * Math.PI) / 180);
      const x2 = 50 + 50 * Math.cos((currentAngle * Math.PI) / 180);
      const y2 = 50 + 50 * Math.sin((currentAngle * Math.PI) / 180);
      const largeArcFlag = angle > 180 ? 1 : 0;

      return {
        ...item,
        path: `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
        startAngle,
        angle,
      };
    });
  }, [religiousData]);

  // Don't show section if no external ID mapping exists
  if (!hasCountryData) {
    return null;
  }

  if (isLoading) {
    return (
      <div className='space-y-3'>
        <div className='h-4 bg-neutral-200 rounded animate-pulse w-3/4' />
        <div className='grid grid-cols-3 gap-3'>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className='h-20 bg-neutral-200 rounded animate-pulse'
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !countryStats) {
    return (
      <div className='text-sm text-neutral-500'>
        Country statistics not available
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Key Metrics Cards */}
      <div className='grid grid-cols-3 gap-3'>
        <div className='bg-secondary-50 dark:bg-secondary-950/30 rounded-lg p-3 border border-secondary-200 dark:border-secondary-800'>
          <UsersIcon className='w-5 h-5 text-secondary-600 dark:text-secondary-400 mb-1' />
          <div className='text-xs text-secondary-600 dark:text-secondary-400 mb-1'>
            Population
          </div>
          <div className='text-lg font-bold text-secondary-700 dark:text-secondary-300'>
            {formatPopulationCompact(
              countryStats.Population ?? countryStats.WBPopulation
            )}
          </div>
        </div>

        <div className='bg-accent-50 dark:bg-accent-950/30 rounded-lg p-3 border border-accent-200 dark:border-accent-800'>
          <GlobeAltIcon className='w-5 h-5 text-accent-600 dark:text-accent-500 mb-1' />
          <div className='text-xs text-accent-600 dark:text-accent-500 mb-1'>
            People Groups
          </div>
          <div className='text-lg font-bold text-accent-700 dark:text-accent-400'>
            {countryStats.CntPeoples ?? countryStats.PeopleGroups ?? 'N/A'}
          </div>
        </div>

        <div className='bg-primary-50 dark:bg-primary-950/30 rounded-lg p-3 border border-primary-200 dark:border-primary-800'>
          <LanguageIcon className='w-5 h-5 text-primary-600 dark:text-primary-400 mb-1' />
          <div className='text-xs text-primary-600 dark:text-primary-400 mb-1'>
            Languages
          </div>
          <div className='text-lg font-bold text-primary-700 dark:text-primary-300'>
            {countryStats.CntPrimaryLanguages ?? 'N/A'}
          </div>
        </div>
      </div>

      {/* Religious Breakdown - Pie Chart */}
      <div>
        <div className='font-semibold text-sm mb-3'>Religious Composition</div>
        <div className='flex items-start gap-4'>
          {/* Pie Chart */}
          <div className='flex-shrink-0'>
            <svg
              viewBox='0 0 100 100'
              className='w-32 h-32'
              style={{ transform: 'rotate(-90deg)' }}
            >
              {pieChartData.map((segment, index) => (
                <path
                  key={index}
                  d={segment.path}
                  fill={segment.color}
                  stroke='white'
                  strokeWidth='0.5'
                />
              ))}
            </svg>
          </div>
          {/* Legend */}
          <div className='flex-1 space-y-1.5'>
            {religiousData.map(religion => (
              <div key={religion.name} className='flex items-center gap-2'>
                <div
                  className='w-3 h-3 rounded-full flex-shrink-0'
                  style={{ backgroundColor: religion.color }}
                />
                <div className='flex-1 flex justify-between text-xs'>
                  <span>{religion.name}</span>
                  <span className='font-medium'>
                    {religion.percent != null
                      ? `${religion.percent.toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Source Attribution */}
      <div className='text-xs text-neutral-400 pt-2 border-t border-neutral-200 dark:border-neutral-800'>
        Data from{' '}
        <a
          href='https://joshuaproject.net'
          target='_blank'
          rel='noopener noreferrer'
          className='underline hover:text-neutral-600'
        >
          Joshua Project
        </a>
      </div>
    </div>
  );
};
