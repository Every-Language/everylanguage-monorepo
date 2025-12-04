import { create } from 'zustand';

export interface DownloadActivityState {
  resolvingByChapterId: Record<string, boolean>;
}

export interface DownloadActivityActions {
  setResolving: (chapterId: string, value: boolean) => void;
  clearResolving: (chapterId: string) => void;
  isResolving: (chapterId: string) => boolean;
}

export type DownloadActivityStore = DownloadActivityState &
  DownloadActivityActions;

export const useDownloadActivityStore = create<DownloadActivityStore>(
  (set, get) => ({
    resolvingByChapterId: {},
    setResolving: (chapterId: string, value: boolean) =>
      set(state => ({
        resolvingByChapterId: {
          ...state.resolvingByChapterId,
          [chapterId]: value,
        },
      })),
    clearResolving: (chapterId: string) =>
      set(state => {
        const next = { ...state.resolvingByChapterId };
        delete next[chapterId];
        return { resolvingByChapterId: next };
      }),
    isResolving: (chapterId: string) => !!get().resolvingByChapterId[chapterId],
  })
);
