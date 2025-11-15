import { create } from 'zustand';

/**
 * Global store to manage which audio player is currently playing
 * Ensures only one audio can play at a time across all InlineAudioPlayer instances
 */
interface AudioPlayerStore {
  currentPlayingId: string | null;
  setCurrentPlaying: (id: string | null) => void;
  pauseAll: () => void;
}

export const useAudioPlayerStore = create<AudioPlayerStore>(set => ({
  currentPlayingId: null,
  setCurrentPlaying: (id: string | null) => {
    set({ currentPlayingId: id });
  },
  pauseAll: () => {
    set({ currentPlayingId: null });
  },
}));
