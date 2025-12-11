import React from 'react';
import { useLanguageStats } from '../hooks/useLanguageStats';

type LinksSectionProps = {
  entityId: string;
};

/**
 * Links Section displays external resource links for a language
 * (FCBH, Jesus Film, GRN)
 */
export const LinksSection: React.FC<LinksSectionProps> = ({ entityId }) => {
  const { data: languageStats, isLoading, error } = useLanguageStats(entityId);

  if (isLoading) {
    return (
      <div className='space-y-2'>
        <div className='h-4 bg-neutral-200 rounded animate-pulse w-3/4' />
        <div className='h-6 bg-neutral-200 rounded animate-pulse w-1/2' />
      </div>
    );
  }

  if (error || !languageStats) {
    return null;
  }

  // Only show if at least one link exists
  if (
    !languageStats.fcbh_url &&
    !languageStats.jf_url &&
    !languageStats.grn_url
  ) {
    return null;
  }

  return (
    <div>
      <div className='font-semibold text-sm mb-3 text-neutral-900 dark:text-neutral-100'>
        Resources
      </div>
      <div className='flex flex-wrap gap-2'>
        {languageStats.fcbh_url && (
          <a
            href={languageStats.fcbh_url}
            target='_blank'
            rel='noopener noreferrer'
            className='text-sm text-primary-600 dark:text-primary-400 hover:underline'>
            FCBH
          </a>
        )}
        {languageStats.jf_url && (
          <a
            href={languageStats.jf_url}
            target='_blank'
            rel='noopener noreferrer'
            className='text-sm text-primary-600 dark:text-primary-400 hover:underline'>
            Jesus Film
          </a>
        )}
        {languageStats.grn_url && (
          <a
            href={languageStats.grn_url}
            target='_blank'
            rel='noopener noreferrer'
            className='text-sm text-primary-600 dark:text-primary-400 hover:underline'>
            GRN
          </a>
        )}
      </div>
    </div>
  );
};
