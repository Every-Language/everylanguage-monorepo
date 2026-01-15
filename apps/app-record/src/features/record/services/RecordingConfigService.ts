import { powerSyncSystem } from '@/shared/infrastructure/powersync';
import { logger } from '@/shared/utils/logger';
import type { RecordingConfigRecord } from '@/powersync/LocalSchema';

/**
 * Recording Configuration Service
 *
 * Manages recording configuration (user preferences) in the local database.
 * Single row with id='default' containing all recording settings.
 */
export interface RecordingConfig {
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
}

/**
 * Default recording configuration values
 */
const DEFAULT_CONFIG: Omit<RecordingConfig, 'id' | 'updated_at'> = {
  start_segment_threshold: 0.1,
  end_segment_threshold: 0.05,
  start_padding_ms: 500,
  end_padding_ms: 500,
  speaker_threshold: 0.08,
  sample_rate: 44100,
  channels: 1, // Mono for speech
  bit_depth: 16,
};

export class RecordingConfigService {
  private static readonly CONFIG_ID = 'default';

  /**
   * Get recording configuration
   * Creates default config if it doesn't exist
   *
   * @returns Recording configuration
   */
  static async getConfig(): Promise<RecordingConfig> {
    if (!powerSyncSystem.isInitialized) {
      throw new Error('PowerSync database not initialized');
    }

    // Tables are automatically created by PowerSync from LocalSchema.ts

    const row = (await powerSyncSystem.get(
      'SELECT * FROM recording_config WHERE id = ?',
      [this.CONFIG_ID]
    )) as RecordingConfigRecord | null;

    if (row) {
      return {
        id: row.id,
        start_segment_threshold: row.start_segment_threshold,
        end_segment_threshold: row.end_segment_threshold,
        start_padding_ms: row.start_padding_ms,
        end_padding_ms: row.end_padding_ms,
        speaker_threshold: row.speaker_threshold,
        sample_rate: row.sample_rate,
        channels: row.channels,
        bit_depth: row.bit_depth,
        updated_at: row.updated_at,
      };
    }

    // Create default config if it doesn't exist
    return await this.createDefaultConfig();
  }

  /**
   * Create default recording configuration
   *
   * @returns Created configuration
   */
  private static async createDefaultConfig(): Promise<RecordingConfig> {
    const now = new Date().toISOString();

    await powerSyncSystem.execute(
      `INSERT INTO recording_config (
        id,
        start_segment_threshold,
        end_segment_threshold,
        start_padding_ms,
        end_padding_ms,
        speaker_threshold,
        sample_rate,
        channels,
        bit_depth,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        this.CONFIG_ID,
        DEFAULT_CONFIG.start_segment_threshold,
        DEFAULT_CONFIG.end_segment_threshold,
        DEFAULT_CONFIG.start_padding_ms,
        DEFAULT_CONFIG.end_padding_ms,
        DEFAULT_CONFIG.speaker_threshold,
        DEFAULT_CONFIG.sample_rate,
        DEFAULT_CONFIG.channels,
        DEFAULT_CONFIG.bit_depth,
        now,
      ]
    );

    logger.info('Created default recording configuration');

    return {
      id: this.CONFIG_ID,
      ...DEFAULT_CONFIG,
      updated_at: now,
    };
  }

  /**
   * Update recording configuration
   *
   * @param updates - Partial configuration to update
   * @returns Updated configuration
   */
  static async updateConfig(
    updates: Partial<Omit<RecordingConfig, 'id' | 'updated_at'>>
  ): Promise<RecordingConfig> {
    if (!powerSyncSystem.isInitialized) {
      throw new Error('PowerSync database not initialized');
    }

    // Ensure config exists
    await this.getConfig();

    const now = new Date().toISOString();

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: unknown[] = [];

    if (updates.start_segment_threshold !== undefined) {
      updateFields.push('start_segment_threshold = ?');
      updateValues.push(updates.start_segment_threshold);
    }
    if (updates.end_segment_threshold !== undefined) {
      updateFields.push('end_segment_threshold = ?');
      updateValues.push(updates.end_segment_threshold);
    }
    if (updates.start_padding_ms !== undefined) {
      updateFields.push('start_padding_ms = ?');
      updateValues.push(updates.start_padding_ms);
    }
    if (updates.end_padding_ms !== undefined) {
      updateFields.push('end_padding_ms = ?');
      updateValues.push(updates.end_padding_ms);
    }
    if (updates.speaker_threshold !== undefined) {
      updateFields.push('speaker_threshold = ?');
      updateValues.push(updates.speaker_threshold);
    }
    if (updates.sample_rate !== undefined) {
      updateFields.push('sample_rate = ?');
      updateValues.push(updates.sample_rate);
    }
    if (updates.channels !== undefined) {
      updateFields.push('channels = ?');
      updateValues.push(updates.channels);
    }
    if (updates.bit_depth !== undefined) {
      updateFields.push('bit_depth = ?');
      updateValues.push(updates.bit_depth);
    }

    if (updateFields.length === 0) {
      // No updates, return current config
      return await this.getConfig();
    }

    updateFields.push('updated_at = ?');
    updateValues.push(now);
    updateValues.push(this.CONFIG_ID);

    await powerSyncSystem.execute(
      `UPDATE recording_config SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    logger.info('Updated recording configuration', updates);

    return await this.getConfig();
  }

  /**
   * Reset configuration to defaults
   *
   * @returns Reset configuration
   */
  static async resetToDefaults(): Promise<RecordingConfig> {
    return await this.updateConfig(DEFAULT_CONFIG);
  }
}
