import { supabase } from '@/shared/services/supabase';
import type { UserProfile } from '../types';

export class ProfileService {
  /**
   * Fetch user profile from public.users table
   * Uses auth.uid() which equals public.users.id
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Handle "not found" errors gracefully
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching user profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Get display name from profile with fallback logic
   */
  getDisplayName(
    profile: UserProfile | null,
    authEmail: string | undefined
  ): string {
    if (!profile) {
      return authEmail || 'User';
    }

    const firstName = profile.first_name?.trim();
    const lastName = profile.last_name?.trim();

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }

    if (firstName) {
      return firstName;
    }

    if (lastName) {
      return lastName;
    }

    return profile.email || authEmail || 'User';
  }
}

export const profileService = new ProfileService();
