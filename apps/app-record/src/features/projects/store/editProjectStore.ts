import { create } from 'zustand';

interface EditProjectState {
  source_language_id: string | null;
  source_language_name: string | null;
  target_language_id: string | null;
  target_language_name: string | null;
  region_id: string | null;
  region_name: string | null;
  setSourceLanguage: (
    languageId: string | null,
    languageName: string | null
  ) => void;
  setTargetLanguage: (
    languageId: string | null,
    languageName: string | null
  ) => void;
  setRegion: (regionId: string | null, regionName: string | null) => void;
  reset: () => void;
}

/**
 * Store for managing edit project form state
 *
 * Used to pass language and region selections between navigation screens.
 * Stores both IDs and names for display and persistence purposes.
 */
export const useEditProjectStore = create<EditProjectState>()(set => ({
  source_language_id: null,
  source_language_name: null,
  target_language_id: null,
  target_language_name: null,
  region_id: null,
  region_name: null,
  setSourceLanguage: (languageId: string | null, languageName: string | null) =>
    set({ source_language_id: languageId, source_language_name: languageName }),
  setTargetLanguage: (languageId: string | null, languageName: string | null) =>
    set({ target_language_id: languageId, target_language_name: languageName }),
  setRegion: (regionId: string | null, regionName: string | null) =>
    set({ region_id: regionId, region_name: regionName }),
  reset: () =>
    set({
      source_language_id: null,
      source_language_name: null,
      target_language_id: null,
      target_language_name: null,
      region_id: null,
      region_name: null,
    }),
}));
