import React from 'react';
import { Globe, AudioLines, BookOpen, CheckCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => {
  return (
    <div className='group relative overflow-hidden rounded-lg border border-primary-300/40 dark:border-white/10 bg-primary-100/50 dark:bg-white/5 backdrop-blur-lg transition-all hover:bg-primary-200/60 dark:hover:bg-white/10 hover:shadow-md hover:shadow-accent-500/10 p-2 lg:p-3'>
      {/* Brownish tint overlay for light mode */}
      <div className='absolute inset-0 bg-gradient-to-br from-primary-200/20 to-primary-300/10 dark:hidden pointer-events-none' />

      <div className='relative flex flex-col items-center text-center'>
        <div className='mb-1.5 rounded-full bg-accent-100 dark:bg-accent-500/10 p-1 text-accent-600 dark:text-accent-400 transition-transform group-hover:scale-110'>
          {icon}
        </div>
        <h3 className='mb-0.5 text-sm lg:text-base font-bold text-neutral-900 dark:text-white tracking-tight'>
          {value}
        </h3>
        <p className='text-[9px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider'>
          {label}
        </p>
      </div>

      {/* Gradient Glow Effect */}
      <div className='absolute -right-4 -top-4 h-12 w-12 rounded-full bg-accent-500/10 dark:bg-accent-500/20 blur-xl transition-opacity group-hover:opacity-100 opacity-0 pointer-events-none' />
      <div className='absolute -left-4 -bottom-4 h-12 w-12 rounded-full bg-secondary-500/10 dark:bg-secondary-500/20 blur-xl transition-opacity group-hover:opacity-100 opacity-0 pointer-events-none' />
    </div>
  );
};

interface TestamentData {
  value: string;
  label: string;
}

interface TestamentStatCardProps {
  icon: React.ReactNode;
  items: TestamentData[];
}

const TestamentStatCard: React.FC<TestamentStatCardProps> = ({
  icon,
  items,
}) => {
  return (
    <div className='group relative overflow-hidden rounded-lg border border-primary-300/40 dark:border-white/10 bg-primary-100/50 dark:bg-white/5 backdrop-blur-lg transition-all hover:bg-primary-200/60 dark:hover:bg-white/10 hover:shadow-md hover:shadow-accent-500/10 p-2 lg:p-3'>
      {/* Brownish tint overlay for light mode */}
      <div className='absolute inset-0 bg-gradient-to-br from-primary-200/20 to-primary-300/10 dark:hidden pointer-events-none' />

      <div className='relative flex flex-col items-center text-center'>
        <div className='mb-1.5 rounded-full bg-accent-100 dark:bg-accent-500/10 p-1 text-accent-600 dark:text-accent-400 transition-transform group-hover:scale-110'>
          {icon}
        </div>
        <div className='flex flex-col gap-0.5'>
          {items.map((item, index) => (
            <div
              key={index}
              className='text-xs lg:text-sm font-bold text-neutral-900 dark:text-white tracking-tight'>
              {item.value}{' '}
              <span className='text-[9px] font-normal text-neutral-600 dark:text-neutral-400 uppercase'>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Gradient Glow Effect */}
      <div className='absolute -right-4 -top-4 h-12 w-12 rounded-full bg-accent-500/10 dark:bg-accent-500/20 blur-xl transition-opacity group-hover:opacity-100 opacity-0 pointer-events-none' />
      <div className='absolute -left-4 -bottom-4 h-12 w-12 rounded-full bg-secondary-500/10 dark:bg-secondary-500/20 blur-xl transition-opacity group-hover:opacity-100 opacity-0 pointer-events-none' />
    </div>
  );
};

interface StatData {
  icon: LucideIcon;
  value: string;
  label: string;
  isTestament?: boolean;
  testamentItems?: TestamentData[];
}

export const StatsGrid: React.FC = () => {
  const statsData: StatData[] = [
    {
      icon: Globe,
      value: '20k',
      label: 'Languages',
    },
    {
      icon: BookOpen,
      value: '20k',
      label: 'Books',
    },
    {
      icon: AudioLines,
      value: '20k',
      label: 'Audio Files',
    },
    {
      icon: CheckCircle,
      isTestament: true,
      testamentItems: [
        { value: '20', label: 'new testament' },
        { value: '5', label: 'full bible' },
      ],
      value: '',
      label: '',
    },
  ];

  return (
    <div className='grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3 lg:gap-4 w-full max-w-5xl mx-auto'>
      {statsData.map((stat, index) => {
        if (stat.isTestament && stat.testamentItems) {
          return (
            <TestamentStatCard
              key={index}
              icon={<stat.icon size={14} />}
              items={stat.testamentItems}
            />
          );
        }
        return (
          <StatCard
            key={index}
            icon={<stat.icon size={14} />}
            value={stat.value}
            label={stat.label}
          />
        );
      })}
    </div>
  );
};
