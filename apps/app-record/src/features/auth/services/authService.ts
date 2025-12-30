import { supabase } from '@/shared/services/supabase';
import type { User, Session } from '../types';

export class AuthService {
  /**
   * Get the current user from Supabase Auth
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error('Error getting current user:', error);
        return null;
      }

      return user;
    } catch (error) {
      console.error('Unexpected error getting current user:', error);
      return null;
    }
  }

  /**
   * Get the current session
   */
  async getCurrentSession(): Promise<Session | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting current session:', error);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Unexpected error getting current session:', error);
      return null;
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(
    callback: (user: User | null, session: Session | null) => void
  ) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null, session);
    });
  }
}

export const authService = new AuthService();
