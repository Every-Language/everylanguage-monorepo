'use client';

import React from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface CollapsibleSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  sectionId: string;
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

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title} section`}
      >
        <span className="font-semibold text-sm">{title}</span>
        {isExpanded ? (
          <ChevronUpIcon className="w-4 h-4 text-neutral-500" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-neutral-500" />
        )}
      </button>
      {isExpanded && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
};


