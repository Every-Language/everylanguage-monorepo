import React from 'react';

export const GlobeVisual: React.FC = () => {
  return (
    <div className='relative flex items-center justify-center w-full h-[400px] lg:h-[500px] overflow-hidden'>
      {/* Main spinning container */}
      <div className='relative w-[240px] h-[240px] md:w-[320px] md:h-[320px] lg:w-[380px] lg:h-[380px] animate-[spin_20s_linear_infinite]'>
        {/* Core Globe Background */}
        <div className='absolute inset-0 rounded-full bg-accent-500/5 dark:bg-accent-500/10 blur-3xl' />

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
          <div className='absolute top-0 left-1/2 w-4 h-4 -translate-x-1/2 rounded-full bg-accent-500 shadow-[0_0_15px_rgba(var(--accent-500),0.5)]' />
        </div>

        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] animate-[spin_18s_linear_infinite_reverse] rotate-45'>
          <div className='absolute bottom-0 left-1/2 w-3 h-3 -translate-x-1/2 rounded-full bg-secondary-400 shadow-[0_0_10px_rgba(var(--secondary-400),0.5)]' />
        </div>
      </div>

      {/* Floating Particles */}
      <div className='absolute inset-0'>
        {/* Can add random particles here if needed */}
      </div>
    </div>
  );
};
