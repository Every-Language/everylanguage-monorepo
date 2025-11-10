import React from 'react';

interface DonateFlowInfoProps {
  title?: string;
  description?: string;
  className?: string;
}

export const DonateFlowInfo: React.FC<DonateFlowInfoProps> = ({
  title = 'End Inaction',
  description = 'Be a part of the movement. Give today to help accelerate Bible translation in every language. Your gift fuels field work and multiplies impact around the globe.',
  className = '',
}) => {
  return (
    <div className={className}>
      <div className='text-xs uppercase tracking-wider text-neutral-500 mb-2'>
        Partner with Every Language
      </div>
      <h2 className='text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-3'>
        {title}
      </h2>
      <p className='text-neutral-700 dark:text-neutral-300 text-sm leading-6'>
        {description}
      </p>
    </div>
  );
};

export default DonateFlowInfo;
