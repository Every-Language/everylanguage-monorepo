import React from 'react';
import { BookOpen, Mic2, Users, Globe2, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: 'gold' | 'emerald' | 'violet' | 'sky';
  index: number;
}

const accentStyles = {
  gold: {
    iconBg: 'bg-amber-100 dark:bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    border: 'group-hover:border-amber-300 dark:group-hover:border-amber-500/30',
    glow: 'from-amber-500/20 to-orange-500/20',
  },
  emerald: {
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    border:
      'group-hover:border-emerald-300 dark:group-hover:border-emerald-500/30',
    glow: 'from-emerald-500/20 to-teal-500/20',
  },
  violet: {
    iconBg: 'bg-violet-100 dark:bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
    border:
      'group-hover:border-violet-300 dark:group-hover:border-violet-500/30',
    glow: 'from-violet-500/20 to-purple-500/20',
  },
  sky: {
    iconBg: 'bg-sky-100 dark:bg-sky-500/10',
    iconColor: 'text-sky-600 dark:text-sky-400',
    border: 'group-hover:border-sky-300 dark:group-hover:border-sky-500/30',
    glow: 'from-sky-500/20 to-blue-500/20',
  },
};

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon: Icon,
  title,
  description,
  accent,
  index,
}) => {
  const styles = accentStyles[accent];

  return (
    <div
      className={`group relative p-6 rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm transition-all duration-500 hover:shadow-xl hover:shadow-neutral-200/50 dark:hover:shadow-none hover:-translate-y-1 ${styles.border}`}
      style={{ animationDelay: `${index * 100}ms` }}>
      {/* Hover glow */}
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${styles.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10`}
      />

      {/* Icon */}
      <div
        className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${styles.iconBg} ${styles.iconColor} mb-4 transition-transform duration-300 group-hover:scale-110`}>
        <Icon className='w-6 h-6' />
      </div>

      {/* Content */}
      <h3 className='text-lg font-bold text-neutral-900 dark:text-white mb-2'>
        {title}
      </h3>
      <p className='text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed'>
        {description}
      </p>
    </div>
  );
};

const features = [
  {
    icon: BookOpen,
    title: 'Bible Translation',
    description:
      'Track and manage Bible translation projects across multiple languages with real-time progress monitoring.',
    accent: 'gold' as const,
  },
  {
    icon: Mic2,
    title: 'Audio Recording',
    description:
      'Professional-grade audio recording tools designed for capturing Scripture in any language with crystal clarity.',
    accent: 'emerald' as const,
  },
  {
    icon: Users,
    title: 'Community Collaboration',
    description:
      'Connect translators, reviewers, and communities to work together seamlessly on translation projects.',
    accent: 'violet' as const,
  },
  {
    icon: Globe2,
    title: 'Global Distribution',
    description:
      'Distribute translated content worldwide through our network of partners and digital platforms.',
    accent: 'sky' as const,
  },
];

export const FeaturesSection: React.FC = () => {
  return (
    <section className='relative w-full overflow-hidden bg-gradient-to-b from-neutral-50 via-white to-neutral-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 py-24 lg:py-32'>
      {/* Decorative elements */}
      <div className='absolute inset-0 pointer-events-none'>
        <div className='absolute top-1/4 left-0 w-72 h-72 bg-accent-200/30 dark:bg-accent-500/5 rounded-full blur-3xl' />
        <div className='absolute bottom-1/4 right-0 w-96 h-96 bg-primary-200/30 dark:bg-primary-500/5 rounded-full blur-3xl' />
      </div>

      {/* Grid pattern overlay */}
      <div
        className='absolute inset-0 opacity-[0.02] dark:opacity-[0.03]'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className='relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <div className='text-center mb-16'>
          <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-100/80 dark:bg-accent-500/10 border border-accent-200 dark:border-accent-500/20 mb-6'>
            <Sparkles className='w-4 h-4 text-accent-600 dark:text-accent-400' />
            <span className='text-sm font-medium text-accent-700 dark:text-accent-300'>
              Powerful Features
            </span>
          </div>

          <h2 className='text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-neutral-900 dark:text-white mb-4'>
            Everything you need to{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-accent-500 to-primary-500'>
              spread the Word
            </span>
          </h2>

          <p className='text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto'>
            A comprehensive platform designed to accelerate Bible translation
            and audio production for every language on earth.
          </p>
        </div>

        {/* Features Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
