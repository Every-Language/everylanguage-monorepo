import type { Tables } from '@everylanguage/shared-types';
import type { User, Session } from '@supabase/supabase-js';

// Re-export common types
export type { User, Session };

// Database table types
export type DbUser = Tables<'users'>;

// User roles interface
export interface UserRole {
  role_key: string;
  role_name: string;
  resource_type: string;
  context_type?: string | null;
  context_id?: string | null;
}

// Auth context interface
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRoles: UserRole[];
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
  userRoles: UserRole[];
}
