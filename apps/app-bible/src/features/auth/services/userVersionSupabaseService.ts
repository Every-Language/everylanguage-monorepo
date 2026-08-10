import { supabase } from '@/shared/services/api/supabase';
import { logger } from '@/shared/utils/logger';

const ENABLE_LOGGING = false;

export interface CurrentSelections {
  current_audio_version_id: string | null;
  current_text_version_id: string | null;
}

export interface SavedAudioVersionRow {
  id: string;
  audio_version_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface SavedTextVersionRow {
  id: string;
  text_version_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserVersionData {
  currentSelections: CurrentSelections | null;
  savedAudioVersions: SavedAudioVersionRow[];
  savedTextVersions: SavedTextVersionRow[];
}

/**
 * Service to fetch user version data (current selections and saved versions) from Supabase.
 * Used for onboarding routing and displaying server-authoritative version data without PowerSync.
 */
export const userVersionSupabaseService = {
  /**
   * Get the user's current audio/text version selections (at most one row per user).
   * Reads from Supabase table user_current_selections (selected_audio_version, selected_text_version).
   */
  async getCurrentSelections(
    userId: string
  ): Promise<CurrentSelections | null> {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('user_current_selections')
        .select('selected_audio_version, selected_text_version')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logger.warn(
          ENABLE_LOGGING,
          'userVersionSupabaseService: getCurrentSelections error',
          error
        );
        return null;
      }
      if (!data) return null;
      return {
        current_audio_version_id: data.selected_audio_version ?? null,
        current_text_version_id: data.selected_text_version ?? null,
      };
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'userVersionSupabaseService: getCurrentSelections exception',
        e
      );
      return null;
    }
  },

  /**
   * Get the user's saved audio version rows.
   */
  async getSavedAudioVersionIds(
    userId: string
  ): Promise<SavedAudioVersionRow[]> {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('user_saved_audio_versions')
        .select('id, audio_version_id, created_at, updated_at')
        .eq('user_id', userId);

      if (error) {
        logger.warn(
          ENABLE_LOGGING,
          'userVersionSupabaseService: getSavedAudioVersionIds error',
          error
        );
        return [];
      }
      return (data ?? []) as SavedAudioVersionRow[];
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'userVersionSupabaseService: getSavedAudioVersionIds exception',
        e
      );
      return [];
    }
  },

  /**
   * Get the user's saved text version rows.
   */
  async getSavedTextVersionIds(userId: string): Promise<SavedTextVersionRow[]> {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('user_saved_text_versions')
        .select('id, text_version_id, created_at, updated_at')
        .eq('user_id', userId);

      if (error) {
        logger.warn(
          ENABLE_LOGGING,
          'userVersionSupabaseService: getSavedTextVersionIds error',
          error
        );
        return [];
      }
      return (data ?? []) as SavedTextVersionRow[];
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'userVersionSupabaseService: getSavedTextVersionIds exception',
        e
      );
      return [];
    }
  },

  /**
   * Fetch current selections and saved audio/text versions in one parallel call.
   */
  async getUserVersionData(userId: string): Promise<UserVersionData> {
    if (!userId) {
      return {
        currentSelections: null,
        savedAudioVersions: [],
        savedTextVersions: [],
      };
    }
    const [currentSelections, savedAudioVersions, savedTextVersions] =
      await Promise.all([
        this.getCurrentSelections(userId),
        this.getSavedAudioVersionIds(userId),
        this.getSavedTextVersionIds(userId),
      ]);
    return {
      currentSelections,
      savedAudioVersions,
      savedTextVersions,
    };
  },

  /**
   * Returns true if the user has any version data on the server (current selections or saved versions).
   */
  async hasUserVersionData(userId: string): Promise<boolean> {
    const data = await this.getUserVersionData(userId);
    const hasCurrent =
      data.currentSelections &&
      (data.currentSelections.current_audio_version_id != null ||
        data.currentSelections.current_text_version_id != null);
    const hasSavedAudio = data.savedAudioVersions.length > 0;
    const hasSavedText = data.savedTextVersions.length > 0;
    return !!(hasCurrent || hasSavedAudio || hasSavedText);
  },
};
