import React from 'react';
import {
  HeroSection,
  LaurenVision,
  LandingFooter,
} from '../../features/landing-page';

export const LandingPage: React.FC = () => {
  return (
    <main>
      <HeroSection />
      <LaurenVision />
      <LandingFooter />
    </main>
  );
};
