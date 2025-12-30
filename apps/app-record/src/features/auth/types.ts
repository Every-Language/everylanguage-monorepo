import type { User, Session } from '@supabase/supabase-js';

// Re-export common types
export type { User, Session };

// Auth context interface
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Auth state interface
export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}
