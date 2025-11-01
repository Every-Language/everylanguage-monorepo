import { supabase } from '@/shared/services/supabase';
import type { User, Session } from '../types';
import { normalizePhoneNumber } from '../utils/phoneValidation';

export class AuthService {
  /**
   * Get the current user from Supabase Auth
   */
  async getCurrentUser() {
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
  async getCurrentSession() {
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
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  /**
   * Sign in with phone and password
   */
  async signInWithPhone(phone: string, password: string) {
    try {
      console.log('📱 Signing in with phone and password:', phone);

      // Normalize phone number for consistent storage
      const normalizedPhone = normalizePhoneNumber(phone);
      console.log('📱 Normalized phone number:', normalizedPhone);

      const { data, error } = await supabase.auth.signInWithPassword({
        phone: normalizedPhone,
        password,
      });

      if (error) {
        throw error;
      }

      console.log('✅ Phone sign in successful:', data);
      return data;
    } catch (error) {
      console.error('Error signing in with phone:', error);
      throw error;
    }
  }

  /**
   * Request OTP for phone login (passwordless)
   */
  async requestPhoneOtp(phone: string) {
    try {
      console.log('📱 Requesting OTP for phone:', phone);

      // Normalize phone number for consistent storage
      const normalizedPhone = normalizePhoneNumber(phone);
      console.log('📱 Normalized phone number:', normalizedPhone);

      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: {
          shouldCreateUser: false, // Prevent automatic user creation for login
        },
      });

      if (error) {
        throw error;
      }

      console.log('✅ OTP requested successfully');
    } catch (error) {
      console.error('Error requesting phone OTP:', error);
      throw error;
    }
  }

  /**
   * Verify OTP for phone authentication
   */
  async verifyOtp(
    phone: string,
    token: string,
    type: 'sms' | 'phone_change' = 'sms'
  ) {
    try {
      // Normalize phone number for consistent verification
      const normalizedPhone = normalizePhoneNumber(phone);
      console.log('📱 Verifying OTP for normalized phone:', normalizedPhone);

      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token,
        type,
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  }

  /**
   * Sign out
   */
  async signOut() {
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
   * Reset password
   */
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Update password
   */
  async updatePassword(password: string) {
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating password:', error);
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
