import { useState, useRef, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import { FilePathService } from '../services/file-path-service';
import { RecordingSegmentService } from '../services/recording-segment-service';
import type { TempSegment } from '../types';

/**
 * Hook for managing file operations during recording
 *
 * Handles segment extraction and cleanup operations.
 */
export const useRecordingFileOperations = (
  sequenceId: string,
  tempSegments: TempSegment[]
) => {
  // Store main recording URI after stop (for potential re-extraction)
  const mainRecordingUriRef = useRef<string | null>(null);
  // Track if segments have been extracted
  const [segmentsExtracted, setSegmentsExtracted] = useState(false);

  /**
   * Extract segments from main recording file
   */
  const extractSegmentsFromRecording = useCallback(
    async (
      mainRecordingUri: string,
      segments: TempSegment[]
    ): Promise<void> => {
      await RecordingSegmentService.extractSegmentsFromRecording(
        mainRecordingUri,
        segments,
        sequenceId
      );
      setSegmentsExtracted(true);
    },
    [sequenceId]
  );

  /**
   * Store main recording URI for later extraction
   */
  const setMainRecordingUri = useCallback((uri: string | null) => {
    mainRecordingUriRef.current = uri;
  }, []);

  /**
   * Cleanup extracted files if user cancels
   */
  const cleanupFiles = useCallback(async (): Promise<void> => {
    if (segmentsExtracted && tempSegments.length > 0) {
      try {
        for (const segment of tempSegments) {
          try {
            await FilePathService.deleteFile(segment.local_file_path);
          } catch (err) {
            // Ignore individual file deletion errors
            // eslint-disable-next-line no-console
            console.warn(`Failed to delete segment file ${segment.id}:`, err);
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to cleanup segment files:', error);
      }
    }
    // Clean up main recording file if it exists
    if (mainRecordingUriRef.current) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(
          mainRecordingUriRef.current
        );
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(mainRecordingUriRef.current, {
            idempotent: true,
          });
        }
      } catch (err) {
        // Ignore cleanup errors for main recording
        // eslint-disable-next-line no-console
        console.warn('Failed to cleanup main recording file:', err);
      }
    }
    setSegmentsExtracted(false);
    mainRecordingUriRef.current = null;
  }, [segmentsExtracted, tempSegments]);

  /**
   * Reset file operations state
   */
  const resetFileOperations = useCallback(() => {
    mainRecordingUriRef.current = null;
    setSegmentsExtracted(false);
  }, []);

  return {
    mainRecordingUriRef,
    segmentsExtracted,
    extractSegmentsFromRecording,
    setMainRecordingUri,
    cleanupFiles,
    resetFileOperations,
  };
};
