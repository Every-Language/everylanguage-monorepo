import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { env } from '@/lib/env';

// Singleton Stripe promise - loads once and reuses across the app
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripePromise = (): Promise<Stripe | null> => {
  if (stripePromise) {
    return stripePromise;
  }

  const pk = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!pk) {
    console.error('❌ Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable');
    console.error('Please ensure your .env.local file exists and contains:');
    console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...');
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')));
    throw new Error('Stripe publishable key is required. Check the console for details.');
  }

  // Initialize Stripe once and cache the promise
  stripePromise = loadStripe(pk);
  return stripePromise;
};
