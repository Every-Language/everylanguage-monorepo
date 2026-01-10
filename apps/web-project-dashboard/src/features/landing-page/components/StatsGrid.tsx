import React from 'react';
import { Globe, AudioLines, BookOpen, CheckCircle } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => {
  return (
    <div className='group relative overflow-hidden rounded-lg border border-primary-300/40 dark:border-white/10 bg-primary-100/50 dark:bg-white/5 backdrop-blur-lg transition-all hover:bg-primary-200/60 dark:hover:bg-white/10 hover:shadow-md hover:shadow-accent-500/10 p-3 lg:p-4'>
      {/* Brownish tint overlay for light mode */}
      <div className='absolute inset-0 bg-gradient-to-br from-primary-200/20 to-primary-300/10 dark:hidden pointer-events-none' />

      <div className='relative flex flex-col items-center text-center'>
        <div className='mb-2 rounded-full bg-accent-100 dark:bg-accent-500/10 p-1.5 text-accent-600 dark:text-accent-400 transition-transform group-hover:scale-110'>
          {icon}
        </div>
        <h3 className='mb-0.5 text-base lg:text-lg font-bold text-neutral-900 dark:text-white tracking-tight'>
          {value}
        </h3>
        <p className='text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider'>
          {label}
        </p>
      </div>

      {/* Gradient Glow Effect */}
      <div className='absolute -right-8 -top-8 h-16 w-16 rounded-full bg-accent-500/10 dark:bg-accent-500/20 blur-xl transition-opacity group-hover:opacity-100 opacity-0 pointer-events-none' />
      <div className='absolute -left-8 -bottom-8 h-16 w-16 rounded-full bg-secondary-500/10 dark:bg-secondary-500/20 blur-xl transition-opacity group-hover:opacity-100 opacity-0 pointer-events-none' />
    </div>
  );
};

const TestamentStatCard: React.FC = () => {
  return (
    <div className='group relative overflow-hidden rounded-lg border border-primary-300/40 dark:border-white/10 bg-primary-100/50 dark:bg-white/5 backdrop-blur-lg transition-all hover:bg-primary-200/60 dark:hover:bg-white/10 hover:shadow-md hover:shadow-accent-500/10 p-3 lg:p-4'>
      {/* Brownish tint overlay for light mode */}
      <div className='absolute inset-0 bg-gradient-to-br from-primary-200/20 to-primary-300/10 dark:hidden pointer-events-none' />

      <div className='relative flex flex-col items-center text-center'>
        <div className='mb-2 rounded-full bg-accent-100 dark:bg-accent-500/10 p-1.5 text-accent-600 dark:text-accent-400 transition-transform group-hover:scale-110'>
          <CheckCircle size={16} />
        </div>
        <div className='flex flex-col gap-1'>
          <div className='text-sm lg:text-base font-bold text-neutral-900 dark:text-white tracking-tight'>
            20{' '}
            <span className='text-xs font-normal text-neutral-600 dark:text-neutral-400 uppercase'>
              new testament
            </span>
          </div>
          <div className='text-sm lg:text-base font-bold text-neutral-900 dark:text-white tracking-tight'>
            5{' '}
            <span className='text-xs font-normal text-neutral-600 dark:text-neutral-400 uppercase'>
              full bible
            </span>
          </div>
        </div>
      </div>

      {/* Gradient Glow Effect */}
      <div className='absolute -right-8 -top-8 h-16 w-16 rounded-full bg-accent-500/10 dark:bg-accent-500/20 blur-xl transition-opacity group-hover:opacity-100 opacity-0 pointer-events-none' />
      <div className='absolute -left-8 -bottom-8 h-16 w-16 rounded-full bg-secondary-500/10 dark:bg-secondary-500/20 blur-xl transition-opacity group-hover:opacity-100 opacity-0 pointer-events-none' />
    </div>
  );
};

export const StatsGrid: React.FC = () => {
  return (
    <div className='grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:gap-6 w-full max-w-4xl mx-auto'>
      <StatCard icon={<Globe size={16} />} value='20k' label='Languages' />

      <StatCard icon={<BookOpen size={16} />} value='20k' label='Books' />
      <StatCard
        icon={<AudioLines size={16} />}
        value='20k'
        label='Audio Files'
      />

      <TestamentStatCard />
    </div>
  );
};
