import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { QueryProvider } from './shared/query/QueryProvider.tsx';
import { AuthProvider } from './features/auth';
import './index.css';
import { loadStripe } from '@stripe/stripe-js';

// Preload Stripe.js for faster checkout initialization (300-500ms improvement)
const pk = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_STRIPE_PK) as string | undefined;
if (pk) {
  loadStripe(pk).catch(err => console.error('Failed to preload Stripe:', err));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryProvider>
  </React.StrictMode>
);
