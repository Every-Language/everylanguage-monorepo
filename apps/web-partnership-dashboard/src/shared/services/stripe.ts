import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';

// Singleton Stripe promise - loads once and reuses across the app
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripePromise = (): Promise<Stripe | null> | null => {
  if (stripePromise) {
    return stripePromise;
  }

  const pk = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_STRIPE_PK) as string | undefined;

  if (!pk) {
    console.error('Missing VITE_STRIPE_PUBLISHABLE_KEY');
    return null;
  }

  // Initialize Stripe once and cache the promise
  stripePromise = loadStripe(pk);
  return stripePromise;
};

// Initialize Stripe eagerly when this module is imported
// This pre-loads Stripe.js before it's actually needed
getStripePromise();
