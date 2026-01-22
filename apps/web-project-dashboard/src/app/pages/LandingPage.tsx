import React from 'react';
import {
  HeroSection,
  FeaturesSection,
  LaurenVision,
  CTASection,
  LandingFooter,
} from '../../features/landing-page';

export const LandingPage: React.FC = () => {
  return (
    <main className='overflow-hidden'>
      <HeroSection />
      <FeaturesSection />
      <LaurenVision />
      <CTASection />
      <LandingFooter />
    </main>
  );
};
