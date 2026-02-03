import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { Button } from '../../../shared/design-system/components/Button';

export const CTASection: React.FC = () => {
  return (
    <section className='relative w-full overflow-hidden bg-neutral-950 py-24 lg:py-32'>
      {/* Animated gradient background */}
      <div className='absolute inset-0'>
        <div className='absolute inset-0 bg-gradient-to-br from-accent-600/20 via-transparent to-primary-600/20' />
        <div className='absolute top-0 left-1/4 w-[500px] h-[500px] bg-accent-500/30 rounded-full blur-[120px] animate-pulse' />
        <div
          className='absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary-500/20 rounded-full blur-[100px] animate-pulse'
          style={{ animationDelay: '1s' }}
        />
      </div>

      {/* Noise texture */}
      <div
        className='absolute inset-0 opacity-20'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className='relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
        {/* Badge */}
        <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-8'>
          <Sparkles className='w-4 h-4 text-amber-400' />
          <span className='text-sm font-medium text-white/90'>
            Join the Movement
          </span>
        </div>

        {/* Headline */}
        <h2 className='text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 leading-tight'>
          Ready to bring the{' '}
          <span className='relative inline-block'>
            <span className='relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300'>
              Gospel
            </span>
            <span className='absolute -bottom-1 left-0 w-full h-2 bg-amber-500/30 rounded-full blur-sm' />
          </span>{' '}
          to every language?
        </h2>

        {/* Description */}
        <p className='text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto mb-10 leading-relaxed'>
          Join thousands of translators, churches, and organizations working
          together to make Scripture accessible to every tribe and tongue.
        </p>

        {/* CTA Buttons */}
        <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
          <Link to='/register'>
            <Button
              size='lg'
              className='bg-white text-neutral-900 hover:bg-neutral-100 border-none px-8 h-14 text-base font-semibold shadow-2xl shadow-white/20 transition-all hover:shadow-white/30 hover:scale-105'>
              Start Your Project
              <ArrowRight className='ml-2 h-5 w-5' />
            </Button>
          </Link>
          <button className='group flex items-center gap-3 px-6 h-14 text-white/90 hover:text-white transition-colors'>
            <span className='flex items-center justify-center w-12 h-12 rounded-full bg-white/10 border border-white/20 group-hover:bg-white/20 transition-colors'>
              <Play className='w-5 h-5 ml-0.5' />
            </span>
            <span className='font-medium'>Watch Demo</span>
          </button>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className='absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-neutral-950 to-transparent' />
    </section>
  );
};
