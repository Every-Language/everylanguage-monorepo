import React from 'react';
import { Quote, Flame, Star } from 'lucide-react';

const visionQuotes = [
  {
    text: 'Our Mother Tongue represents a transformative vision for making the Gospel accessible to every language and culture.',
    position: 'top-[10%] left-[5%]',
    dotPosition: '-top-2 -left-2',
    dotColor: 'bg-amber-500',
    delay: '',
  },
  {
    text: "The vision is clear: empower communities to translate and share God's Word in their own mother tongue.",
    position: 'top-[15%] right-[5%]',
    dotPosition: '-top-2 -right-2',
    dotColor: 'bg-emerald-500',
    delay: 'animation-delay-2000',
  },
  {
    text: "Through technology and collaboration, we're breaking down barriers that have kept the Gospel from reaching every tribe and tongue.",
    position: 'bottom-[10%] left-[8%]',
    dotPosition: '-bottom-2 -left-2',
    dotColor: 'bg-violet-500',
    delay: 'animation-delay-4000',
  },
  {
    text: "This is more than a project—it's a movement toward ensuring no language is left behind in hearing the Good News.",
    position: 'bottom-[15%] right-[8%]',
    dotPosition: '-bottom-2 -right-2',
    dotColor: 'bg-sky-500',
    delay: '',
  },
];

export const LaurenVision: React.FC = () => {
  return (
    <section className='relative w-full overflow-hidden bg-gradient-to-b from-white via-neutral-50 to-white dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 py-24 lg:py-32'>
      {/* Custom Animations */}
      <style>
        {`
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(2deg); }
          }
          @keyframes float-medium {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(-1deg); }
          }
          @keyframes float-fast {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
          .animate-float-medium { animation: float-medium 6s ease-in-out infinite; }
          .animate-float-fast { animation: float-fast 4s ease-in-out infinite; }
          .animation-delay-2000 { animation-delay: 2s; }
          .animation-delay-4000 { animation-delay: 4s; }
          .animate-shimmer {
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            background-size: 200% 100%;
            animation: shimmer 3s infinite;
          }
        `}
      </style>

      {/* Decorative background elements */}
      <div className='absolute inset-0 pointer-events-none overflow-hidden'>
        {/* Gradient orbs */}
        <div className='absolute top-20 left-10 w-64 h-64 bg-amber-200/30 dark:bg-amber-500/10 rounded-full blur-3xl' />
        <div className='absolute bottom-20 right-10 w-80 h-80 bg-sky-200/30 dark:bg-sky-500/10 rounded-full blur-3xl' />
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-200/20 dark:bg-accent-500/5 rounded-full blur-3xl' />
      </div>

      <div className='relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <div className='text-center mb-16'>
          <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-6'>
            <Flame className='w-4 h-4 text-amber-600 dark:text-amber-400' />
            <span className='text-sm font-medium text-amber-700 dark:text-amber-300'>
              Our Heart & Vision
            </span>
          </div>

          <h2 className='text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-neutral-900 dark:text-white mb-4'>
            The{' '}
            <span className='relative inline-block'>
              <span className='relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500'>
                Vision
              </span>
              <span className='absolute -bottom-1 left-0 w-full h-2 bg-gradient-to-r from-amber-300/40 to-orange-300/40 rounded-full blur-sm' />
            </span>{' '}
            Behind the Mission
          </h2>

          <p className='text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto'>
            Words from{' '}
            <span className='font-semibold text-neutral-900 dark:text-white'>
              Lauren Cunningham
            </span>{' '}
            on the heart of Our Mother Tongue
          </p>
        </div>

        {/* Main Content Grid */}
        <div className='relative min-h-[700px] lg:min-h-[600px]'>
          {/* Center Image */}
          <div className='relative z-20 flex justify-center'>
            <div className='group relative'>
              {/* Decorative rings */}
              <div className='absolute inset-0 rounded-full border-2 border-dashed border-amber-300/30 dark:border-amber-500/20 scale-[1.6] animate-[spin_30s_linear_infinite]' />
              <div className='absolute inset-0 rounded-full border border-sky-300/20 dark:border-sky-500/10 scale-[1.3] animate-[spin_20s_linear_infinite_reverse]' />

              {/* Image container */}
              <div className='relative w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80'>
                {/* Glow effect */}
                <div className='absolute inset-0 bg-gradient-to-br from-amber-400/40 via-orange-400/30 to-amber-400/40 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500' />

                {/* Image */}
                <div className='relative w-full h-full rounded-full overflow-hidden ring-4 ring-white/80 dark:ring-white/10 shadow-2xl shadow-neutral-900/20 dark:shadow-black/50 transition-transform duration-500 group-hover:scale-105'>
                  <img
                    src='/images/Lauren.png'
                    alt='Lauren Cunningham'
                    className='w-full h-full object-cover transition-all duration-700 group-hover:scale-110'
                  />
                  {/* Overlay */}
                  <div className='absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/10' />
                </div>

                {/* Floating badge */}
                <div className='absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white dark:bg-neutral-800 rounded-full shadow-lg border border-neutral-200 dark:border-neutral-700'>
                  <div className='flex items-center gap-1.5'>
                    <Star className='w-3.5 h-3.5 text-amber-500 fill-amber-500' />
                    <span className='text-xs font-semibold text-neutral-900 dark:text-white'>
                      Founder
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Quote Cards - Desktop */}
          {visionQuotes.map((quote, idx) => (
            <div
              key={idx}
              className={`hidden lg:block absolute ${quote.position} max-w-xs ${idx % 2 === 0 ? 'animate-float-slow' : 'animate-float-medium'} ${quote.delay}`}>
              <div className='group relative p-5 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-2xl border border-neutral-200/60 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1'>
                {/* Accent dot */}
                <div
                  className={`absolute ${quote.dotPosition} w-3 h-3 ${quote.dotColor} rounded-full shadow-lg`}
                />
                {/* Quote icon */}
                <Quote className='w-4 h-4 text-neutral-400 dark:text-neutral-500 mb-2' />
                <p className='text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed'>
                  "{quote.text}"
                </p>
              </div>
            </div>
          ))}

          {/* Mobile Quote Cards */}
          <div className='lg:hidden mt-12 space-y-4 px-2'>
            {visionQuotes.map((quote, idx) => (
              <div
                key={idx}
                className='relative p-4 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm rounded-xl border border-neutral-200/50 dark:border-white/5 shadow-sm'>
                <div
                  className={`absolute top-3 left-3 w-2 h-2 ${quote.dotColor} rounded-full`}
                />
                <p className='text-sm text-neutral-700 dark:text-neutral-300 pl-4 leading-relaxed'>
                  "{quote.text}"
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Quote */}
        <div className='relative mt-16 max-w-3xl mx-auto'>
          <div className='relative p-8 md:p-10 bg-gradient-to-br from-amber-50 via-white to-sky-50 dark:from-neutral-800 dark:via-neutral-900 dark:to-neutral-800 rounded-3xl border border-neutral-200/60 dark:border-white/10 shadow-xl'>
            {/* Decorative corners */}
            <div className='absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-amber-400/50 rounded-tl-lg' />
            <div className='absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-sky-400/50 rounded-br-lg' />

            <div className='text-center'>
              <Quote className='inline-block w-10 h-10 text-amber-500/50 mb-4' />
              <blockquote className='text-xl md:text-2xl lg:text-3xl font-serif italic leading-relaxed text-neutral-900 dark:text-white mb-6'>
                "Every language deserves to hear the Gospel in their own words."
              </blockquote>
              <div className='flex items-center justify-center gap-3'>
                <div className='h-px w-8 bg-gradient-to-r from-transparent to-neutral-300 dark:to-neutral-600' />
                <span className='text-sm font-bold tracking-widest uppercase text-neutral-500 dark:text-neutral-400'>
                  Lauren Cunningham
                </span>
                <div className='h-px w-8 bg-gradient-to-l from-transparent to-neutral-300 dark:to-neutral-600' />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
