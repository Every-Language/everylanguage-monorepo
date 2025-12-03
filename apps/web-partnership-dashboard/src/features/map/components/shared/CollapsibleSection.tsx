'use client';

import React from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface CollapsibleSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  sectionId: string;
  variant?: 'default' | 'card'; // 'card' applies card styling (rounded-3xl, bg-white, shadow-sm, p-6)
}

/**
 * Collapsible wrapper for inspector panel sections
 * Persists collapsed state in localStorage
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  defaultExpanded = true,
  children,
  sectionId,
  variant = 'default',
}) => {
  const storageKey = `inspector-section-${sectionId}`;

  // Initialize state from localStorage or default
  const [isExpanded, setIsExpanded] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultExpanded;
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === 'true' : defaultExpanded;
  });

  const toggleExpanded = (): void => {
    const newValue = !isExpanded;
    setIsExpanded(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, String(newValue));
    }
  };

  const isCard = variant === 'card';
  const containerClasses = isCard
    ? 'border border-neutral-200 dark:border-neutral-800 rounded-3xl bg-white dark:bg-neutral-900 shadow-sm overflow-hidden'
    : 'border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden';

  const buttonClasses = isCard
    ? 'w-full flex items-center justify-between px-6 pt-6 pb-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors'
    : 'w-full flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors';

  const contentClasses = isCard ? 'px-6 pb-6' : 'px-3 pb-3';

  return (
    <div className={containerClasses}>
      <button
        onClick={toggleExpanded}
        className={buttonClasses}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title} section`}
      >
        <span className='font-semibold text-sm'>{title}</span>
        {isExpanded ? (
          <ChevronUpIcon className='w-4 h-4 text-neutral-500' />
        ) : (
          <ChevronDownIcon className='w-4 h-4 text-neutral-500' />
        )}
      </button>
      {isExpanded && <div className={contentClasses}>{children}</div>}
    </div>
  );
};
