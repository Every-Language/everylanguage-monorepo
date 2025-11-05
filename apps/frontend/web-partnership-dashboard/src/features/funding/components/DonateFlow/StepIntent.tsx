import React from 'react';
import { ArrowRight, Globe, MapPin, Briefcase, Heart } from 'lucide-react';
import type { DonationIntentType } from '../../state/types';

export const StepIntent: React.FC<{ flow: any }> = ({ flow }) => {
  const handleSelect = (type: DonationIntentType) => {
    // Set intent and move to next step
    flow.setIntent({ type });
    flow.next();
  };

  return (
    <div className='space-y-4'>
      <div className='text-sm text-neutral-600 dark:text-neutral-400'>
        What would you like to support?
      </div>
      <div className='grid grid-cols-1 gap-4'>
        {/* Language Card */}
        <button
          onClick={() => handleSelect('language')}
          className='group text-left bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md hover:border-primary-500 dark:hover:border-primary-400 transition-all duration-200 hover:-translate-y-0.5'
        >
          <div className='flex items-start gap-4'>
            <div className='p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg group-hover:bg-primary-200 dark:group-hover:bg-primary-900/40 transition-colors'>
              <Globe className='h-6 w-6 text-primary-600 dark:text-primary-400' />
            </div>
            <div className='flex-1'>
              <div className='flex items-start justify-between mb-2'>
                <h3 className='font-semibold text-lg text-neutral-900 dark:text-neutral-100'>
                  A specific language
                </h3>
                <ArrowRight className='h-5 w-5 text-neutral-400 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors' />
              </div>
              <p className='text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed'>
                Support translation work for a specific Bible-less language or
                people group.
              </p>
            </div>
          </div>
        </button>

        {/* Region Card */}
        <button
          onClick={() => handleSelect('region')}
          className='group text-left bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md hover:border-primary-500 dark:hover:border-primary-400 transition-all duration-200 hover:-translate-y-0.5'
        >
          <div className='flex items-start gap-4'>
            <div className='p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg group-hover:bg-primary-200 dark:group-hover:bg-primary-900/40 transition-colors'>
              <MapPin className='h-6 w-6 text-primary-600 dark:text-primary-400' />
            </div>
            <div className='flex-1'>
              <div className='flex items-start justify-between mb-2'>
                <h3 className='font-semibold text-lg text-neutral-900 dark:text-neutral-100'>
                  A region
                </h3>
                <ArrowRight className='h-5 w-5 text-neutral-400 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors' />
              </div>
              <p className='text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed'>
                Support translation work in a specific geographical region or
                country.
              </p>
            </div>
          </div>
        </button>

        {/* Operation Card */}
        <button
          onClick={() => handleSelect('operation')}
          className='group text-left bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md hover:border-primary-500 dark:hover:border-primary-400 transition-all duration-200 hover:-translate-y-0.5'
        >
          <div className='flex items-start gap-4'>
            <div className='p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg group-hover:bg-primary-200 dark:group-hover:bg-primary-900/40 transition-colors'>
              <Briefcase className='h-6 w-6 text-primary-600 dark:text-primary-400' />
            </div>
            <div className='flex-1'>
              <div className='flex items-start justify-between mb-2'>
                <h3 className='font-semibold text-lg text-neutral-900 dark:text-neutral-100'>
                  Operational costs
                </h3>
                <ArrowRight className='h-5 w-5 text-neutral-400 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors' />
              </div>
              <p className='text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed'>
                Support background operations like administration, servers,
                travel, and legal fees.
              </p>
            </div>
          </div>
        </button>

        {/* Wherever Needed Most Card */}
        <button
          onClick={() => handleSelect('unrestricted')}
          className='group text-left bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md hover:border-primary-500 dark:hover:border-primary-400 transition-all duration-200 hover:-translate-y-0.5'
        >
          <div className='flex items-start gap-4'>
            <div className='p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg group-hover:bg-primary-200 dark:group-hover:bg-primary-900/40 transition-colors'>
              <Heart className='h-6 w-6 text-primary-600 dark:text-primary-400' />
            </div>
            <div className='flex-1'>
              <div className='flex items-start justify-between mb-2'>
                <h3 className='font-semibold text-lg text-neutral-900 dark:text-neutral-100'>
                  Wherever needed most
                </h3>
                <ArrowRight className='h-5 w-5 text-neutral-400 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors' />
              </div>
              <p className='text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed'>
                Let our team allocate your donation to the areas of greatest
                need.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default StepIntent;
