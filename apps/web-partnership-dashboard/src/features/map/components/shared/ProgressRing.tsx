import React from 'react';

interface ProgressRingProps {
  value: number; // 0-100
  size?: number; // diameter in pixels
  strokeWidth?: number;
  className?: string;
}

/**
 * Circular progress ring for displaying percentages
 */
export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 56,
  strokeWidth = 7,
  className,
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = size / 2;
  const normalizedRadius = radius - strokeWidth;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <svg height={size} width={size} className={`shrink-0 ${className ?? ''}`}>
      {/* Background circle */}
      <circle
        stroke='currentColor'
        fill='transparent'
        strokeWidth={strokeWidth}
        strokeOpacity={0.2}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      {/* Progress circle */}
      <circle
        className='text-accent-600'
        stroke='currentColor'
        fill='transparent'
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.4s ease' }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      {/* Percentage text */}
      <text
        x='50%'
        y='50%'
        dominantBaseline='middle'
        textAnchor='middle'
        className='text-sm fill-current'
      >
        {Math.round(clamped)}%
      </text>
    </svg>
  );
};
