import React from 'react';
import {
  useJPCountryData,
  useHasJPCountryData,
} from '../hooks/useJoshuaProject';
import {
  UsersIcon,
  GlobeAltIcon,
  LanguageIcon,
} from '@heroicons/react/24/outline';

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
  const { countryStats, isLoading, error } = useJPCountryData(entityId);

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

  // Religious breakdown data
  const religiousData = [
    {
      name: 'Christian',
      percent: countryStats.PercentChristianPC,
      population: countryStats.PCChristianity,
    },
    {
      name: 'Islam',
      percent: countryStats.PercentIslam,
      population: countryStats.PCIslam,
    },
    {
      name: 'Buddhism',
      percent: countryStats.PercentBuddhism,
      population: countryStats.PCBuddhism,
    },
    {
      name: 'Hinduism',
      percent: countryStats.PercentHinduism,
      population: countryStats.PCHinduism,
    },
    {
      name: 'Ethnic Religions',
      percent: countryStats.PercentEthnicReligions,
      population: countryStats.PCEthnicReligions,
    },
    {
      name: 'Non-Religious',
      percent: countryStats.PercentNonReligious,
      population: countryStats.PCNonReligious,
    },
    {
      name: 'Other',
      percent: countryStats.PercentOtherSmall,
      population: countryStats.PCOtherSmall,
    },
  ]
    .filter(item => item.percent > 0)
    .sort((a, b) => b.percent - a.percent);

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
            {(() => {
              const population =
                countryStats.Population ?? countryStats.WBPopulation;
              return population != null
                ? `${(population / 1000000).toFixed(1)}M`
                : 'N/A';
            })()}
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

      {/* Geographic Info */}
      <div>
        <div className='font-semibold text-sm mb-2'>Geographic Region</div>
        <div className='text-sm space-y-1'>
          <div className='flex justify-between'>
            <span className='text-neutral-500'>Continent:</span>
            <span className='font-medium'>{countryStats.ContinentName}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-neutral-500'>Region:</span>
            <span className='font-medium'>{countryStats.RegionName}</span>
          </div>
          {countryStats.WindowStatus && (
            <div className='flex justify-between'>
              <span className='text-neutral-500'>Window 10/40:</span>
              <span className='font-medium'>{countryStats.WindowStatus}</span>
            </div>
          )}
        </div>
      </div>

      {/* Religious Breakdown */}
      <div>
        <div className='font-semibold text-sm mb-2'>Religious Composition</div>
        <div className='space-y-2'>
          {religiousData.map(religion => (
            <div key={religion.name}>
              <div className='flex justify-between text-sm mb-1'>
                <span>{religion.name}</span>
                <span className='font-medium'>
                  {religion.percent != null
                    ? `${religion.percent.toFixed(1)}%`
                    : 'N/A'}
                </span>
              </div>
              <div className='w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2'>
                <div
                  className='bg-secondary-600 dark:bg-secondary-500 h-2 rounded-full transition-all'
                  style={{ width: `${religion.percent}%` }}
                />
              </div>
              {religion.population != null && (
                <div className='text-xs text-neutral-500 mt-0.5'>
                  {religion.population.toLocaleString()} people
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Economic & Development Info */}
      <div>
        <div className='font-semibold text-sm mb-2'>Development Indicators</div>
        <div className='text-sm space-y-1'>
          {countryStats.WBIncome && (
            <div className='flex justify-between'>
              <span className='text-neutral-500'>Income Level:</span>
              <span className='font-medium'>{countryStats.WBIncome}</span>
            </div>
          )}
          {countryStats.InternetUsage != null && (
            <div className='flex justify-between'>
              <span className='text-neutral-500'>Internet Usage:</span>
              <span className='font-medium'>
                {countryStats.InternetUsage.toFixed(1)}%
              </span>
            </div>
          )}
          {countryStats.PhoneDensity != null && (
            <div className='flex justify-between'>
              <span className='text-neutral-500'>Phone Density:</span>
              <span className='font-medium'>
                {countryStats.PhoneDensity.toFixed(0)}/100
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Security Level */}
      {countryStats.SecurityLevel && (
        <div>
          <div className='font-semibold text-sm mb-2'>Access & Security</div>
          <div className='flex items-center gap-2'>
            <div className='flex-1'>
              <div className='text-xs text-neutral-500 mb-1'>
                Security Level
              </div>
              <div className='w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2'>
                <div
                  className={`h-2 rounded-full transition-all ${
                    countryStats.SecurityLevel <= 2
                      ? 'bg-success-600'
                      : countryStats.SecurityLevel === 3
                        ? 'bg-warning-500'
                        : 'bg-error-600'
                  }`}
                  style={{
                    width: `${(countryStats.SecurityLevel / 5) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className='text-lg font-bold text-neutral-700'>
              {countryStats.SecurityLevel}/5
            </div>
          </div>
        </div>
      )}

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
