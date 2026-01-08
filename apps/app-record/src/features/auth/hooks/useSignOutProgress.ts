import { useState, useEffect } from 'react';
import {
  signOutProgressService,
  type SignOutProgress,
} from '@/shared/services/SignOutProgressService';

/**
 * Hook to subscribe to sign-out progress updates
 */
export const useSignOutProgress = () => {
  const [progress, setProgress] = useState<SignOutProgress>(() =>
    signOutProgressService.getCurrentProgress()
  );

  useEffect(() => {
    const unsubscribe = signOutProgressService.subscribe(setProgress);
    return unsubscribe;
  }, []);

  return progress;
};
