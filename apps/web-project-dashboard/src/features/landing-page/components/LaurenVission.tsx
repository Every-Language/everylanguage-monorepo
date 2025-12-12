import React from 'react';
import { Quote } from 'lucide-react';

export const LaurenVission: React.FC = () => {
  return (
    <section className='relative w-full overflow-hidden bg-neutral-50 dark:bg-neutral-950 py-24 lg:py-40'>
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
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
          .animate-float-medium { animation: float-medium 6s ease-in-out infinite; }
          .animate-float-fast { animation: float-fast 4s ease-in-out infinite; }
          .animate-blob { animation: blob 7s infinite; }
          .animation-delay-2000 { animation-delay: 2s; }
          .animation-delay-4000 { animation-delay: 4s; }
        `}
      </style>

      {/* Dynamic Background */}
      <div className='absolute inset-0 pointer-events-none overflow-hidden'>
        <div className='absolute top-0 left-1/4 w-96 h-96 bg-accent-200/20 dark:bg-accent-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob opacity-70' />
        <div className='absolute top-0 right-1/4 w-96 h-96 bg-primary-200/20 dark:bg-primary-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-2000 opacity-70' />
        <div className='absolute -bottom-32 left-1/3 w-96 h-96 bg-secondary-200/20 dark:bg-secondary-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-4000 opacity-70' />
      </div>

      <div className='relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='text-center mb-20 animate-float-fast'>
          <h2 className='text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-neutral-900 dark:text-white mb-6'>
            Our{' '}
            <span className='relative inline-block'>
              <span className='relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-accent-500 via-accent-600 to-accent-700 dark:from-accent-300 dark:via-accent-400 dark:to-accent-600'>
                Vision
              </span>
              <span className='absolute -bottom-2 left-0 w-full h-3 bg-accent-200/40 dark:bg-accent-500/20 -rotate-2 rounded-full blur-sm' />
            </span>
          </h2>
          <p className='text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto font-light'>
            Words from{' '}
            <span className='font-semibold text-neutral-900 dark:text-white'>
              Lauren Cunningham
            </span>{' '}
            on the heart of Our Mother Tongue
          </p>
        </div>

        {/* Creative Layout */}
        <div className='relative min-h-[800px] flex flex-col items-center justify-center'>
          {/* Centerpiece */}
          <div className='relative z-20 group cursor-default'>
            {/* Decorative Rings */}
            <div className='absolute inset-0 rounded-full border border-neutral-200 dark:border-white/10 scale-[1.8] animate-[spin_20s_linear_infinite] opacity-30' />
            <div className='absolute inset-0 rounded-full border border-dashed border-neutral-300 dark:border-white/20 scale-[1.4] animate-[spin_15s_linear_infinite_reverse] opacity-30' />

            {/* Image Container */}
            <div className='relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 transition-transform duration-500 group-hover:scale-105'>
              <div className='absolute inset-0 bg-gradient-to-br from-accent-500 to-primary-500 rounded-[2rem] rotate-6 opacity-20 blur-xl group-hover:opacity-30 transition-opacity' />
              <div className='relative w-full h-full rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/20 rotate-3 transition-transform duration-500 group-hover:rotate-0'>
                <img
                  src='/images/Lauren.png'
                  alt='Lauren Cunningham'
                  className='w-full h-full object-cover filter grayscale-[20%] group-hover:grayscale-0 transition-all duration-700'
                />
                {/* Inner Shadow Overlay */}
                <div className='absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent' />
              </div>
            </div>
          </div>

          {/* Floating Cards - Desktop */}
          {/* Top Left */}
          <div className='hidden lg:block absolute top-[10%] left-[5%] max-w-xs animate-float-slow'>
            <div className='group relative p-6 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md rounded-2xl border border-white/50 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2'>
              <div className='absolute -top-2 -left-2 w-4 h-4 bg-accent-500 rounded-full' />
              <p className='font-serif text-neutral-700 dark:text-neutral-200 italic'>
                "Our Mother Tongue represents a transformative vision for making
                the Gospel accessible to every language and culture."
              </p>
            </div>
          </div>

          {/* Top Right */}
          <div className='hidden lg:block absolute top-[15%] right-[5%] max-w-xs animate-float-medium animation-delay-2000'>
            <div className='group relative p-6 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md rounded-2xl border border-white/50 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2'>
              <div className='absolute -top-2 -right-2 w-4 h-4 bg-primary-500 rounded-full' />
              <p className='font-serif text-neutral-700 dark:text-neutral-200 italic'>
                "The vision is clear: empower communities to translate and share
                God's Word in their own mother tongue."
              </p>
            </div>
          </div>

          {/* Bottom Left */}
          <div className='hidden lg:block absolute bottom-[10%] left-[8%] max-w-xs animate-float-medium animation-delay-4000'>
            <div className='group relative p-6 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md rounded-2xl border border-white/50 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2'>
              <div className='absolute -bottom-2 -left-2 w-4 h-4 bg-secondary-500 rounded-full' />
              <p className='font-serif text-neutral-700 dark:text-neutral-200 italic'>
                "Through technology and collaboration, we're breaking down
                barriers that have kept the Gospel from reaching every tribe and
                tongue."
              </p>
            </div>
          </div>

          {/* Bottom Right */}
          <div className='hidden lg:block absolute bottom-[15%] right-[8%] max-w-xs animate-float-slow'>
            <div className='group relative p-6 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md rounded-2xl border border-white/50 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2'>
              <div className='absolute -bottom-2 -right-2 w-4 h-4 bg-accent-500 rounded-full' />
              <p className='font-serif text-neutral-700 dark:text-neutral-200 italic'>
                "This is more than a project—it's a movement toward ensuring no
                language is left behind in hearing the Good News."
              </p>
            </div>
          </div>

          {/* Mobile Stack */}
          <div className='lg:hidden w-full mt-16 space-y-6 px-4'>
            {[
              'Our Mother Tongue represents a transformative vision for making the Gospel accessible to every language and culture.',
              "The vision is clear: empower communities to translate and share God's Word in their own mother tongue.",
              "Through technology and collaboration, we're breaking down barriers that have kept the Gospel from reaching every tribe and tongue.",
              "This is more than a project—it's a movement toward ensuring no language is left behind in hearing the Good News.",
            ].map((quote, idx) => (
              <div
                key={idx}
                className='relative p-5 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-sm rounded-xl border border-neutral-200/50 dark:border-white/5'>
                <Quote className='w-4 h-4 text-accent-500 mb-2 opacity-70' />
                <p className='font-serif text-sm text-neutral-700 dark:text-neutral-300 italic'>
                  "{quote}"
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Quote - At Bottom */}
        <div className='relative z-30 mt-20 mb-8 max-w-2xl mx-auto text-center animate-float-medium'>
          <Quote className='inline-block w-8 h-8 text-accent-500 mb-4 opacity-50' />
          <h3 className='text-2xl md:text-4xl font-serif font-medium italic leading-relaxed text-neutral-900 dark:text-white drop-shadow-sm'>
            "Every language deserves to hear the Gospel in their own words."
          </h3>
          <div className='mt-6 flex items-center justify-center gap-4'>
            <div className='h-px w-12 bg-neutral-300 dark:bg-neutral-700' />
            <p className='text-sm font-bold tracking-widest uppercase text-neutral-500 dark:text-neutral-400'>
              Lauren Cunningham
            </p>
            <div className='h-px w-12 bg-neutral-300 dark:bg-neutral-700' />
          </div>
        </div>
      </div>
    </section>
  );
};
