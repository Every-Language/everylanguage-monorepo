import { useProfileStore, UserProfile } from '../store/profileStore';
import { supabase } from '../services/api/supabase';
import { logger } from '../utils/logger';

export const useProfileOperations = () => {
  const { setProfile, setLoading, setError, clearProfile } = useProfileStore();

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      // Transform null values to undefined for consistency with our interface
      const transformedData = {
        id: data.id,
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
        email: data.email || undefined,
        phone: data.phone_number || undefined,
        created_at: data.created_at || undefined,
        updated_at: data.updated_at || undefined,
      };

      setProfile(transformedData);
      setLoading(false);
    } catch (error) {
      logger.error(true, 'Failed to fetch user profile:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to fetch profile'
      );
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Omit<UserProfile, 'id'>>) => {
    const { profile } = useProfileStore.getState();
    if (!profile) return false;

    try {
      // Transform undefined values to null for Supabase, but preserve existing email/phone if not being updated
      const transformedUpdates = {
        ...updates,
        updated_at: new Date().toISOString(),
        first_name: updates.first_name ?? null,
        last_name: updates.last_name ?? null,
        email:
          updates.email !== undefined
            ? (updates.email ?? null)
            : (profile.email ?? null),
        phone_number:
          updates.phone !== undefined
            ? (updates.phone ?? null)
            : (profile.phone ?? null),
        created_at: updates.created_at ?? null,
      };

      const { error } = await supabase
        .from('users')
        .update(transformedUpdates)
        .eq('id', profile.id);

      if (error) throw error;

      // Update local state immediately
      setProfile({ ...profile, ...updates });
      return true;
    } catch (error) {
      logger.error(true, 'Failed to update profile:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update profile'
      );
      return false;
    }
  };

  return {
    fetchProfile,
    updateProfile,
    clearProfile,
  };
};
