import { useState, useCallback } from 'react';
import { powerSyncSystem } from '@/shared/infrastructure/powersync/services/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';
import { useAuth } from '@/shared/hooks';
import { findFirstVerseId, findLastVerseId } from '../utils/verseHelpers';
import type { CreateSequenceFormData } from '../types/sequence';

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  // Try to use crypto.randomUUID() if available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = global;
  if (g?.crypto?.randomUUID) {
    return g.crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Hook for creating sequences
 *
 * Handles sequence creation with PowerSync local database.
 */
export const useCreateSequence = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const createSequence = useCallback(
    async (data: CreateSequenceFormData, projectId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!powerSyncSystem.isInitialized) {
          throw new Error('PowerSync database not initialized');
        }

        if (!data.chapter_id) {
          throw new Error('Chapter is required');
        }

        // Find first and last verse IDs
        const startVerseId = await findFirstVerseId(data.chapter_id);
        const endVerseId = await findLastVerseId(data.chapter_id);

        if (!startVerseId || !endVerseId) {
          throw new Error('Could not find verses for the selected chapter');
        }

        const sequenceId = generateUUID();
        const now = new Date().toISOString();
        const createdBy = user?.id || null;

        await powerSyncSystem.execute(
          `INSERT INTO sequences (
            id, 
            name, 
            description, 
            book_id,
            chapter_id,
            is_bible_audio,
            start_verse_id,
            end_verse_id,
            project_id,
            created_at, 
            updated_at,
            created_by,
            upload_status,
            publish_status,
            check_status,
            deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sequenceId,
            data.name.trim(),
            data.description.trim() || null,
            data.book_id,
            data.chapter_id,
            1, // is_bible_audio = TRUE (1 in SQLite)
            startVerseId,
            endVerseId,
            projectId,
            now,
            now,
            createdBy,
            'pending',
            'pending',
            'pending',
            null, // deleted_at
          ]
        );

        logger.info('Sequence created successfully:', {
          sequenceId,
          name: data.name,
          projectId,
        });
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to create sequence');
        logger.error('Failed to create sequence:', error);
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  return {
    createSequence,
    isLoading,
    error,
  };
};
