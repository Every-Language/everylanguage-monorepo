import { useProfileOperations } from './useProfileOperations';
import { useAuthFromStore } from '../../features/auth/hooks/useAuthFromStore';
import { useEffect } from 'react';

/**
 * Hook that automatically syncs profile data with auth events
 * Use this in your auth flow to ensure profile stays in sync
 */
export const useAuthProfileSync = () => {
  const { userId } = useAuthFromStore();
  const { fetchProfile, clearProfile } = useProfileOperations();

  useEffect(() => {
    if (userId) {
      // Fetch profile when user is authenticated
      fetchProfile(userId);
    } else {
      // Clear profile when user is not authenticated
      clearProfile();
    }
  }, [userId, fetchProfile, clearProfile]);
};
