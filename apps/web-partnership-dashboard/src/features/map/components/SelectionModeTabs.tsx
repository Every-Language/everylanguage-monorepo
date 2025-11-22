'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  useSelectionMode,
  useSetSelectionMode,
  type SelectionMode,
} from '../inspector/state/inspectorStore';

interface SelectionModeTabsProps {
  className?: string;
}

export const SelectionModeTabs: React.FC<SelectionModeTabsProps> = ({
  className,
}) => {
  const mode = useSelectionMode();
  const setMode = useSetSelectionMode();
  const router = useRouter();

  const tabs: { id: SelectionMode; label: string }[] = [
    { id: 'language', label: 'Languages' },
    { id: 'region', label: 'Regions' },
    { id: 'people_group', label: 'People groups' },
  ];

  const handleModeChange = (newMode: SelectionMode) => {
    if (newMode !== mode) {
      setMode(newMode); // This already clears selection
      router.push('/map'); // Navigate to global view
    }
  };

  return (
    <div
      className={`flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg ${className || ''}`}
    >
      {tabs.map(tab => {
        const isActive = mode === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleModeChange(tab.id)}
            className={`flex-1 px-3 py-1.5 text-sm font-medium transition-all rounded-md ${
              isActive
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
