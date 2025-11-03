import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { DonateIntent } from '../../state/types';

export const StepChooseIntent: React.FC<{ flow: any }> = ({ flow }) => {
  const choose = (intent: DonateIntent) => {
    // setIntent advances to the first step for the chosen path
    flow.setIntent(intent);
  };
  return (
    <div className='space-y-4'>
      <div className='text-sm text-neutral-600 dark:text-neutral-400'>
        Choose how you want to give
      </div>
      <div className='grid grid-cols-1 gap-4'>
        {/* Support Operational Costs Card */}
        <button
          onClick={() => choose('ops')}
          className='group text-left bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md hover:border-primary-500 dark:hover:border-primary-400 transition-all duration-200 hover:-translate-y-0.5'
        >
          <div className='flex items-start justify-between mb-2'>
            <h3 className='font-semibold text-lg text-neutral-900 dark:text-neutral-100'>
              Support operational costs
            </h3>
            <ArrowRight className='h-5 w-5 text-neutral-400 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors' />
          </div>
          <p className='text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed'>
            Give to the background operational costs of Every Language, which
            helps fund our servers, administration, and legal fees. This allows
            every dollar someone gives to 'adopt a language' go straight to
            translation and distribution projects.
          </p>
        </button>

        {/* Adopt a Language Card */}
        <button
          onClick={() => choose('adopt')}
          className='group text-left bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md hover:border-primary-500 dark:hover:border-primary-400 transition-all duration-200 hover:-translate-y-0.5'
        >
          <div className='flex items-start justify-between mb-2'>
            <h3 className='font-semibold text-lg text-neutral-900 dark:text-neutral-100'>
              Adopt a language
            </h3>
            <ArrowRight className='h-5 w-5 text-neutral-400 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors' />
          </div>
          <p className='text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed'>
            Choose a Bible-less language or people group, and partner with them
            to see the full Bible translated into a new language.
          </p>
        </button>
      </div>
    </div>
  );
};

export default StepChooseIntent;
