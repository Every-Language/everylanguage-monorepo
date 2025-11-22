import React from 'react';
import { Card, CardContent } from './ui/Card';
import { useJPCountryDataCache } from '@/features/map/hooks/useJPCountryDataCache';
import { useRegionStatsContextual } from '@/features/map/hooks/useRegionStatsContextual';
import { formatPopulationCompact } from '@/features/map/utils/formatPopulation';

export type RegionCardProps = {
  regionId: string;
  // Contextual data - if provided, shows language-specific stats
  contextualLanguageId?: string;
  // Display options (all optional, defaults shown)
  showName?: boolean; // default: true
  showPopulation?: boolean; // default: true
  showPeopleGroupCount?: boolean; // default: false
  showLanguageCount?: boolean; // default: false
  showBibleStatusBreakdown?: boolean; // default: true
  showReligiousComposition?: boolean; // default: false
  // Click handler
  onClick?: (regionId: string) => void;
  // Selection state
  isSelected?: boolean;
  // Styling
  className?: string;
};

export const RegionCard: React.FC<RegionCardProps> = ({
  regionId,
  contextualLanguageId,
  showName = true,
  showPopulation = true,
  showPeopleGroupCount = false,
  showLanguageCount = false,
  showBibleStatusBreakdown = true,
  showReligiousComposition = false,
  onClick,
  isSelected,
  className = '',
}) => {
  // Fetch total stats from MV
  const { countryStats, isLoading: totalLoading } =
    useJPCountryDataCache(regionId);

  // Fetch contextual stats if language provided
  const { data: contextualStats, isLoading: contextualLoading } =
    useRegionStatsContextual(
      contextualLanguageId ? regionId : null,
      contextualLanguageId || null
    );

  const isLoading = totalLoading || contextualLoading;

  // Use contextual stats if available, otherwise fall back to total stats
  const regionName =
    contextualStats?.region_name || countryStats?.Ctry || 'Unknown';
  const population =
    contextualStats?.region_population ??
    countryStats?.Population ??
    countryStats?.WBPopulation;
  const peopleGroupCount =
    contextualStats?.region_people_group_count ??
    countryStats?.CntPeoples ??
    countryStats?.PeopleGroups;
  const languageCount =
    contextualStats?.region_language_count ?? countryStats?.CntPrimaryLanguages;

  // Bible status breakdown
  const languagesNoScripture = contextualStats?.languages_no_scripture ?? null;
  const languagesPortions = contextualStats?.languages_portions ?? null;
  const languagesNewTestament =
    contextualStats?.languages_new_testament ?? null;
  const languagesFullBible = contextualStats?.languages_full_bible ?? null;

  const handleClick = () => {
    if (onClick) {
      onClick(regionId);
    }
  };

  if (isLoading) {
    return (
      <div className='w-full'>
        <Card
          padding='sm'
          variant='ghost'
          className={`border border-neutral-200 dark:border-neutral-800 ${className}`}
        >
          <CardContent>
            <div className='h-12 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse' />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      className={`w-full text-left ${className}`}
    >
      <Card
        padding='sm'
        variant='ghost'
        className={`border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 ${isSelected ? 'ring-2 ring-accent-600 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900' : ''}`}
      >
        <CardContent>
          <div className='space-y-2'>
            {/* Name */}
            {showName && (
              <div
                className={`text-sm font-medium ${isSelected ? 'text-accent-600' : 'text-neutral-900 dark:text-neutral-100'}`}
              >
                {regionName}
              </div>
            )}

            {/* Stats Grid */}
            <div className='flex flex-wrap items-center gap-3 text-xs'>
              {/* Population */}
              {showPopulation && population != null && (
                <div className='text-neutral-600 dark:text-neutral-400'>
                  <span className='font-medium'>
                    {formatPopulationCompact(population)}
                  </span>{' '}
                  <span className='text-neutral-500'>people</span>
                </div>
              )}

              {/* People Group Count */}
              {showPeopleGroupCount && peopleGroupCount != null && (
                <div className='text-neutral-600 dark:text-neutral-400'>
                  <span className='font-medium'>{peopleGroupCount}</span>{' '}
                  <span className='text-neutral-500'>people groups</span>
                </div>
              )}

              {/* Language Count */}
              {showLanguageCount && languageCount != null && (
                <div className='text-neutral-600 dark:text-neutral-400'>
                  <span className='font-medium'>{languageCount}</span>{' '}
                  <span className='text-neutral-500'>languages</span>
                </div>
              )}
            </div>

            {/* Bible Status Breakdown */}
            {showBibleStatusBreakdown &&
              (languagesNoScripture != null ||
                languagesPortions != null ||
                languagesNewTestament != null ||
                languagesFullBible != null) && (
                <div className='grid grid-cols-4 gap-1 pt-1'>
                  {languagesNoScripture != null && (
                    <div className='text-center p-1.5 bg-error-50 dark:bg-error-900/30 rounded text-sm'>
                      <div className='font-medium text-error-700 dark:text-error-300 text-base'>
                        {languagesNoScripture}
                      </div>
                      <div className='text-error-600 dark:text-error-400 text-xs leading-tight mt-0.5'>
                        languages
                      </div>
                      <div className='text-error-600 dark:text-error-400 text-xs leading-tight'>
                        No Scripture
                      </div>
                    </div>
                  )}
                  {languagesPortions != null && (
                    <div className='text-center p-1.5 bg-[#eb6a38]/10 dark:bg-[#eb6a38]/20 rounded text-sm'>
                      <div className='font-medium text-[#eb6a38] text-base'>
                        {languagesPortions}
                      </div>
                      <div className='text-[#eb6a38]/80 text-xs leading-tight mt-0.5'>
                        languages
                      </div>
                      <div className='text-[#eb6a38]/80 text-xs leading-tight'>
                        Portions
                      </div>
                    </div>
                  )}
                  {languagesNewTestament != null && (
                    <div className='text-center p-1.5 bg-warning-50 dark:bg-warning-900/30 rounded text-sm'>
                      <div className='font-medium text-warning-700 dark:text-warning-300 text-base'>
                        {languagesNewTestament}
                      </div>
                      <div className='text-warning-600 dark:text-warning-400 text-xs leading-tight mt-0.5'>
                        languages
                      </div>
                      <div className='text-warning-600 dark:text-warning-400 text-xs leading-tight'>
                        New Testament
                      </div>
                    </div>
                  )}
                  {languagesFullBible != null && (
                    <div className='text-center p-1.5 bg-success-50 dark:bg-success-900/30 rounded text-sm'>
                      <div className='font-medium text-success-700 dark:text-success-300 text-base'>
                        {languagesFullBible}
                      </div>
                      <div className='text-success-600 dark:text-success-400 text-xs leading-tight mt-0.5'>
                        languages
                      </div>
                      <div className='text-success-600 dark:text-success-400 text-xs leading-tight'>
                        Whole Bible
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* Religious Composition */}
            {showReligiousComposition &&
              contextualStats &&
              (contextualStats.percent_christianity != null ||
                contextualStats.percent_islam != null ||
                contextualStats.percent_buddhism != null ||
                contextualStats.percent_hinduism != null ||
                contextualStats.percent_ethnic_religions != null ||
                contextualStats.percent_non_religious != null ||
                contextualStats.percent_other_small != null) && (
                <div className='space-y-1 pt-1'>
                  <div className='text-xs font-medium text-neutral-700 dark:text-neutral-300'>
                    Religious Composition
                  </div>
                  <div className='space-y-0.5 text-xs'>
                    {contextualStats.percent_christianity != null && (
                      <div className='flex justify-between'>
                        <span className='text-neutral-600 dark:text-neutral-400'>
                          Christianity
                        </span>
                        <span className='font-medium'>
                          {contextualStats.percent_christianity.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {contextualStats.percent_islam != null && (
                      <div className='flex justify-between'>
                        <span className='text-neutral-600 dark:text-neutral-400'>
                          Islam
                        </span>
                        <span className='font-medium'>
                          {contextualStats.percent_islam.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {contextualStats.percent_buddhism != null && (
                      <div className='flex justify-between'>
                        <span className='text-neutral-600 dark:text-neutral-400'>
                          Buddhism
                        </span>
                        <span className='font-medium'>
                          {contextualStats.percent_buddhism.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {contextualStats.percent_hinduism != null && (
                      <div className='flex justify-between'>
                        <span className='text-neutral-600 dark:text-neutral-400'>
                          Hinduism
                        </span>
                        <span className='font-medium'>
                          {contextualStats.percent_hinduism.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {contextualStats.percent_ethnic_religions != null && (
                      <div className='flex justify-between'>
                        <span className='text-neutral-600 dark:text-neutral-400'>
                          Ethnic Religions
                        </span>
                        <span className='font-medium'>
                          {contextualStats.percent_ethnic_religions.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {contextualStats.percent_non_religious != null && (
                      <div className='flex justify-between'>
                        <span className='text-neutral-600 dark:text-neutral-400'>
                          Non-Religious
                        </span>
                        <span className='font-medium'>
                          {contextualStats.percent_non_religious.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {contextualStats.percent_other_small != null && (
                      <div className='flex justify-between'>
                        <span className='text-neutral-600 dark:text-neutral-400'>
                          Other
                        </span>
                        <span className='font-medium'>
                          {contextualStats.percent_other_small.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        </CardContent>
      </Card>
    </button>
  );
};
