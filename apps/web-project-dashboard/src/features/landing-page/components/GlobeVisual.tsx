import React from 'react';

export const GlobeVisual: React.FC = () => {
  return (
    <div className='relative flex items-center justify-center w-full h-[320px] lg:h-[400px] xl:h-[450px] overflow-hidden'>
      {/* Main spinning container for rings */}
      <div className='relative w-[220px] h-[220px] md:w-[280px] md:h-[280px] lg:w-[340px] lg:h-[340px] xl:w-[380px] xl:h-[380px] animate-[spin_20s_linear_infinite]'>
        {/* Rings/Meridians */}
        {[0, 45, 90, 135].map(deg => (
          <div
            key={deg}
            className='absolute inset-0 rounded-full border border-neutral-300/30 dark:border-white/10'
            style={{ transform: `rotate(${deg}deg)` }}
          />
        ))}

        {/* Inner Rings */}
        <div className='absolute inset-4 rounded-full border border-neutral-300/30 dark:border-white/10 border-dashed animate-[spin_15s_linear_infinite_reverse]' />
        <div className='absolute inset-12 rounded-full border border-accent-500/20 dark:border-accent-500/30 border-dotted animate-[spin_10s_linear_infinite]' />

        {/* Orbiting Elements */}
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] animate-[spin_25s_linear_infinite]'>
          <div className='absolute top-0 left-1/2 w-4 h-4 -translate-x-1/2 rounded-full bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)]' />
        </div>

        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] animate-[spin_18s_linear_infinite_reverse] rotate-45'>
          <div className='absolute bottom-0 left-1/2 w-3 h-3 -translate-x-1/2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]' />
        </div>
      </div>

      {/* Center Globe Image - Static, doesn't spin with rings */}
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] md:w-[260px] md:h-[260px] lg:w-[320px] lg:h-[320px] xl:w-[360px] xl:h-[360px] z-10'>
        {/* Globe image */}
        <img
          src='/images/globe.png'
          alt='Earth Globe'
          className='w-full h-full rounded-full object-cover shadow-2xl shadow-neutral-500/30 ring-2 ring-white/20 dark:ring-white/10'
        />

        {/* Overlay gradient for depth and atmosphere effect */}
        <div className='absolute inset-0 rounded-full bg-gradient-to-br from-white/10 via-transparent to-neutral-900/40 pointer-events-none' />

        {/* Highlight reflection */}
        <div className='absolute top-4 left-6 w-[25%] h-[25%] rounded-full bg-white/30 blur-md pointer-events-none' />
      </div>

      {/* Floating Particles */}
      <div className='absolute inset-0'>
        {/* Can add random particles here if needed */}
      </div>
    </div>
  );
};
