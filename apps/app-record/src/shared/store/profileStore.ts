import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  first_name?: string | undefined;
  last_name?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  created_at?: string | undefined;
  updated_at?: string | undefined;
}

interface ProfileStoreState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

interface ProfileStoreActions {
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearProfile: () => void;
}

export const useProfileStore = create<
  ProfileStoreState & ProfileStoreActions
>()(
  persist(
    set => ({
      // Initial state
      profile: null,
      isLoading: false,
      error: null,

      // Simple state setters only
      setProfile: profile => set({ profile }),
      setLoading: loading => set({ isLoading: loading }),
      setError: error => set({ error }),

      clearProfile: () =>
        set({
          profile: null,
          error: null,
        }),
    }),
    {
      name: 'profile-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        profile: state.profile,
      }),
    }
  )
);
