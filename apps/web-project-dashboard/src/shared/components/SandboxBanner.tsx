import * as React from 'react';
import { SandboxBanner as SharedSandboxBanner } from '@everylanguage/shared-ui';

/**
 * Wrapper component that handles environment detection for Vite apps
 * and passes the result to the shared SandboxBanner component
 */
export function SandboxBanner(): React.JSX.Element | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const environment = import.meta.env.VITE_ENVIRONMENT;
  const isDevProject = supabaseUrl?.includes('-dev') ?? false;

  // Check explicit environment variable first (most reliable)
  if (environment === 'production' && !isDevProject) {
    return <SharedSandboxBanner show={false} />;
  }
  if (environment === 'development' || environment === 'preview') {
    return <SharedSandboxBanner show={true} />;
  }

  // No explicit env var set - fall back to URL check or dev mode
  const isProduction = import.meta.env.MODE === 'production';
  if (isProduction && !isDevProject) {
    return <SharedSandboxBanner show={false} />;
  }

  // Show for dev mode or dev project
  return <SharedSandboxBanner show={true} />;
}
