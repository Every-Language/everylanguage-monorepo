import type { AuthError } from '@supabase/supabase-js';
import type { PowerSyncBackendConnector } from '@powersync/react-native';

// Supabase-specific types
export interface SupabaseSession {
  access_token?: string;
  user?: {
    id: string;
    email?: string;
    aud?: string;
    is_anonymous?: boolean;
  };
}

export interface SupabaseAuthResponse {
  data: { session: SupabaseSession | null };
  error: AuthError | null;
}

// PowerSync-specific types
export interface PowerSyncCredentials {
  endpoint: string;
  token: string;
  parameters?: Record<string, string>;
}

// Database operation types
export interface DatabaseRecord {
  id: string;
  [key: string]: unknown;
}

export interface DatabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
}

// Export the connector interface for convenience
export type { PowerSyncBackendConnector };
