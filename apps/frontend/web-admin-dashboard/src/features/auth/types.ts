import type { Tables } from '@everylanguage/shared-types';
import type { User, Session } from '@supabase/supabase-js';

// Re-export common types
export type { User, Session };

// Database table types
export type DbUser = Tables<'users'>;

// Auth context interface
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithPhone: (phone: string, password: string) => Promise<void>;
  requestPhoneOtp: (phone: string) => Promise<void>;
  verifyOtp: (
    phone: string,
    token: string,
    type?: 'sms' | 'phone_change'
  ) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Auth state interface
export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}
