import { useQuery } from '@powersync/react';
import { useEffect, useState } from 'react';
import {
  RecordingConfigService,
  type RecordingConfig,
} from '../services/RecordingConfigService';

/**
 * Hook for accessing recording configuration
 *
 * Fetches configuration from local database and ensures default config exists.
 * Returns reactive data that updates when configuration changes.
 */
export const useRecordingConfig = () => {
  const [config, setConfig] = useState<RecordingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Query configuration from database
  // Tables are automatically created by PowerSync from LocalSchema.ts
  const { data: dbConfig, error: queryError } = useQuery<{
    id: string;
    start_segment_threshold: number;
    end_segment_threshold: number;
    start_padding_ms: number;
    end_padding_ms: number;
    speaker_threshold: number;
    sample_rate: number;
    channels: number;
    bit_depth: number;
    updated_at: string;
  }>(
    `SELECT id, start_segment_threshold, end_segment_threshold,
            start_padding_ms, end_padding_ms, speaker_threshold,
            sample_rate, channels, bit_depth, updated_at
     FROM recording_config 
     WHERE id = 'default'`,
    []
  );

  // Load or create config when database query completes
  useEffect(() => {
    const loadConfig = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        // If query succeeded and we have data, use it
        if (dbConfig && dbConfig.length > 0) {
          const firstConfig = dbConfig[0];
          setConfig({
            id: firstConfig.id,
            start_segment_threshold: firstConfig.start_segment_threshold,
            end_segment_threshold: firstConfig.end_segment_threshold,
            start_padding_ms: firstConfig.start_padding_ms,
            end_padding_ms: firstConfig.end_padding_ms,
            speaker_threshold: firstConfig.speaker_threshold,
            sample_rate: firstConfig.sample_rate,
            channels: firstConfig.channels,
            bit_depth: firstConfig.bit_depth,
            updated_at: firstConfig.updated_at,
          });
          setIsLoading(false);
          return;
        }

        // If no data and no error, or if there was an error (table might not exist),
        // try to get/create config via service (which will ensure tables exist)
        if (!dbConfig || dbConfig.length === 0 || queryError) {
          try {
            const defaultConfig = await RecordingConfigService.getConfig();
            setConfig(defaultConfig);
          } catch (err) {
            const error =
              err instanceof Error
                ? err
                : new Error('Failed to load recording config');
            setError(error);
          }
        }
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error('Failed to load recording config');
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadConfig();
  }, [dbConfig, queryError]);

  /**
   * Update configuration
   */
  const updateConfig = async (
    updates: Partial<Omit<RecordingConfig, 'id' | 'updated_at'>>
  ): Promise<void> => {
    try {
      setError(null);
      const updated = await RecordingConfigService.updateConfig(updates);
      setConfig(updated);
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Failed to update recording config');
      setError(error);
      throw error;
    }
  };

  /**
   * Reset configuration to defaults
   */
  const resetToDefaults = async (): Promise<void> => {
    try {
      setError(null);
      const reset = await RecordingConfigService.resetToDefaults();
      setConfig(reset);
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Failed to reset recording config');
      setError(error);
      throw error;
    }
  };

  return {
    config,
    isLoading,
    error,
    updateConfig,
    resetToDefaults,
  };
};
