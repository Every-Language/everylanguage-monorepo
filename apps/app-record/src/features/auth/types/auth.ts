import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
}

export interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signInWithFreshStart: (email: string, password: string) => Promise<void>;
  signInWithPhone: (phone: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    userData?: { firstName?: string; lastName?: string }
  ) => Promise<void>;
  signUpWithPhone: (
    phone: string,
    password: string,
    userData?: { firstName?: string; lastName?: string }
  ) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  completeVerification: () => Promise<void>;
  clearVerificationState: () => void;
  isVerificationRequired: boolean;
  verificationType: 'email' | 'phone' | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
}
