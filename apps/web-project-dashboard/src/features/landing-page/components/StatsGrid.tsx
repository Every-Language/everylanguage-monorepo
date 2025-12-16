import React from 'react';
import { Globe, AudioLines, BookOpen, CheckCircle } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => {
  return (
    <div className='group relative overflow-hidden rounded-xl border border-primary-300/40 dark:border-white/10 bg-primary-100/50 dark:bg-white/5 backdrop-blur-lg transition-all hover:bg-primary-200/60 dark:hover:bg-white/10 hover:shadow-lg hover:shadow-accent-500/10 p-4 lg:p-6'>
      {/* Brownish tint overlay for light mode */}
      <div className='absolute inset-0 bg-gradient-to-br from-primary-200/20 to-primary-300/10 dark:hidden pointer-events-none' />

      <div className='relative flex flex-col items-center text-center'>
        <div className='mb-3 rounded-full bg-accent-100 dark:bg-accent-500/10 p-2 text-accent-600 dark:text-accent-400 transition-transform group-hover:scale-110'>
          {icon}
        </div>
        <h3 className='mb-1 text-lg lg:text-xl font-bold text-neutral-900 dark:text-white tracking-tight'>
          {value}
        </h3>
        <p className='text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider'>
          {label}
        </p>
      </div>

      {/* Gradient Glow Effect */}
      <div className='absolute -right-10 -top-10 h-24 w-24 rounded-full bg-accent-500/10 dark:bg-accent-500/20 blur-2xl transition-opacity group-hover:opacity-100 opacity-0 pointer-events-none' />
      <div className='absolute -left-10 -bottom-10 h-24 w-24 rounded-full bg-secondary-500/10 dark:bg-secondary-500/20 blur-2xl transition-opacity group-hover:opacity-100 opacity-0 pointer-events-none' />
    </div>
  );
};

const TestamentStatCard: React.FC = () => {
  return (
    <div className='group relative overflow-hidden rounded-xl border border-primary-300/40 dark:border-white/10 bg-primary-100/50 dark:bg-white/5 backdrop-blur-lg transition-all hover:bg-primary-200/60 dark:hover:bg-white/10 hover:shadow-lg hover:shadow-accent-500/10 p-4 lg:p-6'>
      {/* Brownish tint overlay for light mode */}
      <div className='absolute inset-0 bg-gradient-to-br from-primary-200/20 to-primary-300/10 dark:hidden pointer-events-none' />

      <div className='relative flex flex-col items-center text-center'>
        <div className='mb-3 rounded-full bg-accent-100 dark:bg-accent-500/10 p-2 text-accent-600 dark:text-accent-400 transition-transform group-hover:scale-110'>
          <CheckCircle size={20} />
        </div>
        <div className='flex flex-col gap-1.5'>
          <div className='text-base lg:text-lg font-bold text-neutral-900 dark:text-white tracking-tight'>
            20{' '}
            <span className='text-sm font-normal text-neutral-600 dark:text-neutral-400 uppercase'>
              new testament
            </span>
          </div>
          <div className='text-base lg:text-lg font-bold text-neutral-900 dark:text-white tracking-tight'>
            5{' '}
            <span className='text-sm font-normal text-neutral-600 dark:text-neutral-400 uppercase'>
              full bible translations
            </span>
          </div>
        </div>
      </div>

      {/* Gradient Glow Effect */}
      <div className='absolute -right-10 -top-10 h-24 w-24 rounded-full bg-accent-500/10 dark:bg-accent-500/20 blur-2xl transition-opacity group-hover:opacity-100 opacity-0 pointer-events-none' />
      <div className='absolute -left-10 -bottom-10 h-24 w-24 rounded-full bg-secondary-500/10 dark:bg-secondary-500/20 blur-2xl transition-opacity group-hover:opacity-100 opacity-0 pointer-events-none' />
    </div>
  );
};

export const StatsGrid: React.FC = () => {
  return (
    <div className='grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8 lg:gap-12 w-full max-w-6xl mx-auto'>
      <StatCard icon={<Globe size={20} />} value='20k' label='Languages' />

      <StatCard icon={<BookOpen size={20} />} value='20k' label='Books' />
      <StatCard
        icon={<AudioLines size={20} />}
        value='20k'
        label='Audio Files'
      />

      <TestamentStatCard />
    </div>
  );
};
