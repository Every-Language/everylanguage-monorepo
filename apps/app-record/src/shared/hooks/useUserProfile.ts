import { useProfileStore } from '../store/profileStore';
import { useProfileOperations } from './useProfileOperations';
import { useAuthFromStore } from '../../features/auth/hooks/useAuthFromStore';
import { useEffect } from 'react';

export const useUserProfile = () => {
  const { userId } = useAuthFromStore();
  const { profile, isLoading, error } = useProfileStore();
  const { fetchProfile, updateProfile, clearProfile } = useProfileOperations();

  // Auto-fetch profile when userId changes
  useEffect(() => {
    if (userId && !profile) {
      fetchProfile(userId);
    }
  }, [userId, profile, fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    refreshProfile: () => (userId ? fetchProfile(userId) : Promise.resolve()),
    updateProfile,
    clearProfile,
    fullName: profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      : null,
    hasProfile: !!profile,
  };
};
