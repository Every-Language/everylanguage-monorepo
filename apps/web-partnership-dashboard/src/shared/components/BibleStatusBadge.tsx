import React from 'react';

export type BibleStatusBadgeProps = {
  bibleStatus: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
};

/**
 * Reusable component for displaying Bible translation status
 * Color scheme:
 * - Red: No Scripture (status 0 or null)
 * - Orange: Portions (status 1-3)
 * - Yellow: New Testament (status 4)
 * - Green: Whole Bible (status 5)
 */
export const BibleStatusBadge: React.FC<BibleStatusBadgeProps> = ({
  bibleStatus,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  // Determine status category
  const getStatusInfo = () => {
    if (
      bibleStatus === null ||
      bibleStatus === undefined ||
      bibleStatus === 0
    ) {
      return {
        label: 'No Scripture',
        bgColor: 'bg-error-600',
        textColor: 'text-white',
      };
    }
    if (bibleStatus === 5) {
      return {
        label: 'Whole Bible',
        bgColor: 'bg-success-600',
        textColor: 'text-white',
      };
    }
    if (bibleStatus === 4) {
      return {
        label: 'New Testament',
        bgColor: 'bg-warning-500',
        textColor: 'text-white',
      };
    }
    if (bibleStatus >= 1 && bibleStatus < 4) {
      return {
        label: 'Portions',
        bgColor: 'bg-[#eb6a38]',
        textColor: 'text-white',
      };
    }
    // Fallback
    return {
      label: 'Unknown',
      bgColor: 'bg-neutral-500',
      textColor: 'text-white',
    };
  };

  const statusInfo = getStatusInfo();

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded font-medium ${statusInfo.bgColor} ${statusInfo.textColor} ${sizeClasses[size]} ${className}`}
    >
      {showLabel ? statusInfo.label : null}
    </span>
  );
};
