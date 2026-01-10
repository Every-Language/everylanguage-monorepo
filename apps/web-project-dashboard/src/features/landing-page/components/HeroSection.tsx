import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Upload } from 'lucide-react';
import { Button } from '../../../shared/design-system/components/Button';
import { StatsGrid } from './StatsGrid';
import { GlobeVisual } from './GlobeVisual';
import { LandingNavbar } from './LandingNavbar';

export const HeroSection: React.FC = () => {
  return (
    <div className='relative w-full overflow-hidden bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white selection:bg-accent-500/30 flex flex-col'>
      {/* Background Gradients */}
      <div className='absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden'>
        <div className='absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full bg-primary-200/30 dark:bg-primary-700/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen' />
        <div className='absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent-200/30 dark:bg-accent-800/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen' />
        <div className='absolute top-[20%] left-[10%] w-[400px] h-[400px] rounded-full bg-secondary-200/30 dark:bg-secondary-900/20 blur-[80px] mix-blend-multiply dark:mix-blend-screen' />
      </div>

      {/* Navbar */}
      <LandingNavbar />

      {/* Main Content */}
      <div className='relative z-10 flex flex-col justify-start pt-8 lg:pt-12 w-full max-w-[90%] lg:max-w-[85%] mx-auto px-1 lg:px-2 pb-6'>
        <div className='flex flex-col lg:flex-row items-center gap-4 lg:gap-4 mb-4'>
          {/* Left Side: Pitch */}
          <div className='flex-[2] text-left lg:pr-2 px-auto lg:pl-2'>
            {/* Headline */}
            <h1 className='text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white sm:text-5xl lg:text-6xl mb-3 leading-tight'>
              Propagate the{' '}
              <span className='text-transparent bg-clip-text bg-gradient-to-r from-accent-500 via-accent-600 to-accent-700 dark:from-accent-300 dark:via-accent-400 dark:to-accent-600'>
                Gospel
              </span>
              <br />
              to the Nations
            </h1>

            {/* Description */}
            <p className='text-base leading-7 text-neutral-600 dark:text-neutral-300 mb-4 max-w-xl'>
              Making the gospel available to all tribes and tongue.
            </p>

            {/* CTA Buttons */}
            <div className='flex flex-col sm:flex-row gap-3 mb-2'>
              <Link to='/register'>
                <Button
                  size='md'
                  className='w-full sm:w-auto bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 border-none text-sm px-6 h-11 shadow-lg shadow-neutral-900/10 dark:shadow-white/5'>
                  Start Project <ArrowRight className='ml-2 h-4 w-4' />
                </Button>
              </Link>
              <Link to='/audio-files'>
                <Button
                  variant='outline'
                  size='md'
                  className='w-full sm:w-auto border-neutral-300 dark:border-white/20 text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-white/10 text-sm px-6 h-11 backdrop-blur-sm'>
                  <Upload className='ml-2 h-4 w-4 mr-2' />
                  Upload Audio
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Side: Globe Visual */}
          <div className='flex-1 w-full flex items-center justify-center lg:justify-end'>
            <GlobeVisual />
          </div>
        </div>

        {/* Stats Section (Glass Boxes) - Positioned to be visible without scroll */}
        <div className='w-full mt-4'>
          <StatsGrid />
        </div>
      </div>

      {/* Texture Overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none mix-blend-multiply dark:mix-blend-overlay" />
    </div>
  );
};
