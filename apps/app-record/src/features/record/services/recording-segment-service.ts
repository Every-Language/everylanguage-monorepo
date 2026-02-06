import * as FileSystem from 'expo-file-system';
import { trimAudio } from '@siteed/expo-audio-studio';
import { FilePathService } from './file-path-service';
import type { TempSegment } from '../types';
import type { AudioAnalysis } from '@siteed/expo-audio-studio';

/**
 * Generate UUID for segment ID
 */
export const generateSegmentId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Recording Segment Service
 *
 * Business logic for segment detection and extraction.
 * Separated from hooks for reusability and testability.
 */
export class RecordingSegmentService {
  /**
   * Extract segments from main recording file
   */
  static async extractSegmentsFromRecording(
    mainRecordingUri: string,
    segments: TempSegment[],
    sequenceId: string
  ): Promise<void> {
    if (segments.length === 0 || !mainRecordingUri) {
      // eslint-disable-next-line no-console
      console.log('Skipping extraction:', {
        segmentsCount: segments.length,
        hasMainUri: !!mainRecordingUri,
      });
      return;
    }

    try {
      // eslint-disable-next-line no-console
      console.log('Starting segment extraction:', {
        segmentsCount: segments.length,
        mainRecordingUri,
      });

      // Ensure directory exists
      await FilePathService.ensureSequenceDirectory(sequenceId);

      // Extract each segment from the main recording
      for (const segment of segments) {
        try {
          const absolutePath = FilePathService.getAbsolutePath(
            segment.local_file_path
          );

          // eslint-disable-next-line no-console
          console.log('Extracting segment:', {
            segmentId: segment.id,
            startTimeMs: segment.start_time_ms,
            endTimeMs: segment.end_time_ms,
            targetPath: absolutePath,
          });

          // Extract segment using trimAudio
          const trimmedResult = await trimAudio({
            fileUri: mainRecordingUri,
            ranges: [
              {
                startTimeMs: segment.start_time_ms,
                endTimeMs: segment.end_time_ms,
              },
            ],
            mode: 'keep',
            outputFormat: { format: 'aac' },
          });

          // eslint-disable-next-line no-console
          console.log('trimAudio result:', trimmedResult);

          // Get the trimmed file URI from the result
          let trimmedFileUri =
            (trimmedResult as { uri?: string; fileUri?: string }).uri ||
            (trimmedResult as { uri?: string; fileUri?: string }).fileUri;

          if (!trimmedFileUri) {
            // eslint-disable-next-line no-console
            console.error('No file URI in trimAudio result:', trimmedResult);
            continue;
          }

          // Normalize the path
          trimmedFileUri = trimmedFileUri
            .replace(/\/\.\.\/?$/, '')
            .replace(/\/+$/, '');

          // Check if the path is a directory - if so, find the audio file inside
          const sourceInfo = await FileSystem.getInfoAsync(trimmedFileUri);
          if (sourceInfo.exists && sourceInfo.isDirectory) {
            const dirContents =
              await FileSystem.readDirectoryAsync(trimmedFileUri);
            const audioFile = dirContents.find(
              f =>
                f.endsWith('.aac') || f.endsWith('.m4a') || f.endsWith('.wav')
            );
            if (audioFile) {
              trimmedFileUri = `${trimmedFileUri}/${audioFile}`;
            } else {
              // eslint-disable-next-line no-console
              console.error(
                'No audio file found in directory:',
                trimmedFileUri
              );
              continue;
            }
          }

          // eslint-disable-next-line no-console
          console.log('Copying file:', {
            from: trimmedFileUri,
            to: absolutePath,
          });

          // Check if target file already exists and remove it
          const targetExists = await FileSystem.getInfoAsync(absolutePath);
          if (targetExists.exists) {
            await FileSystem.deleteAsync(absolutePath, { idempotent: true });
          }

          // Copy the trimmed file to the segment's path
          await FileSystem.copyAsync({
            from: trimmedFileUri,
            to: absolutePath,
          });

          // Verify the file was copied successfully
          const copiedFileInfo = await FileSystem.getInfoAsync(absolutePath);
          if (!copiedFileInfo.exists) {
            // eslint-disable-next-line no-console
            console.error(
              'File copy failed, file does not exist:',
              absolutePath
            );
            continue;
          }

          // Clean up the source file if it's in a temp directory
          if (trimmedFileUri.includes('/tmp/')) {
            try {
              await FileSystem.deleteAsync(trimmedFileUri, {
                idempotent: true,
              });
            } catch {
              // Ignore cleanup errors
            }
          }

          // Verify file was created
          const fileInfo = await FileSystem.getInfoAsync(absolutePath);
          if (fileInfo.exists) {
            // eslint-disable-next-line no-console
            console.log('Segment file created successfully:', absolutePath);
          } else {
            // eslint-disable-next-line no-console
            console.error('Segment file not found after move:', absolutePath);
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`Failed to extract segment ${segment.id}:`, err);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to extract segments:', err);
    }
  }

  /**
   * Detect segments from post-recording analysis (fallback when real-time analysis fails)
   */
  static detectSegmentsFromPostAnalysis(
    postAnalysis: AudioAnalysis,
    recordingDurationMs: number,
    startThreshold: number,
    endThreshold: number,
    sequenceId: string,
    projectId: string
  ): TempSegment[] {
    const fallbackSegments: TempSegment[] = [];
    let activeSegmentStart: {
      timeMs: number;
      level: number;
    } | null = null;
    let segIdx = 1;

    for (const point of postAnalysis.dataPoints) {
      // Use RMS for threshold comparison (standardized with real-time detection)
      const level = point.rms ?? 0;
      // startTime/endTime from extractAudioAnalysis are in seconds; convert to ms
      const pointStartMs =
        point.startTime != null
          ? point.startTime * 1000
          : point.id * postAnalysis.segmentDurationMs;
      const pointEndMs =
        point.endTime != null
          ? point.endTime * 1000
          : (point.id + 1) * postAnalysis.segmentDurationMs;

      if (!activeSegmentStart && level >= startThreshold) {
        activeSegmentStart = {
          timeMs: pointStartMs,
          level,
        };
      } else if (activeSegmentStart && level <= endThreshold) {
        const segDurationMs = pointEndMs - activeSegmentStart.timeMs;
        const segDurationSeconds = segDurationMs / 1000;

        if (segDurationSeconds > 0.1) {
          const segmentId = generateSegmentId();
          const now = new Date().toISOString();
          const relativePath = FilePathService.getRelativePath(
            sequenceId,
            segmentId
          );

          fallbackSegments.push({
            id: segmentId,
            local_file_path: relativePath,
            sequence_id: sequenceId,
            project_id: projectId,
            segment_index: segIdx,
            is_hidden: false,
            audio_level: level,
            duration_seconds: segDurationSeconds,
            start_time_ms: activeSegmentStart.timeMs,
            end_time_ms: pointEndMs,
            recording_status: 'completed',
            created_at: now,
            updated_at: now,
          });
          segIdx++;
        }
        activeSegmentStart = null;
      }
    }

    // Finalize any segment still active at end of recording
    if (activeSegmentStart) {
      const segDurationMs = recordingDurationMs - activeSegmentStart.timeMs;
      const segDurationSeconds = segDurationMs / 1000;

      if (segDurationSeconds > 0.1) {
        const segmentId = generateSegmentId();
        const now = new Date().toISOString();
        const relativePath = FilePathService.getRelativePath(
          sequenceId,
          segmentId
        );

        fallbackSegments.push({
          id: segmentId,
          local_file_path: relativePath,
          sequence_id: sequenceId,
          project_id: projectId,
          segment_index: segIdx,
          is_hidden: false,
          audio_level: activeSegmentStart.level,
          duration_seconds: segDurationSeconds,
          start_time_ms: activeSegmentStart.timeMs,
          end_time_ms: recordingDurationMs,
          recording_status: 'completed',
          created_at: now,
          updated_at: now,
        });
      }
    }

    return fallbackSegments;
  }

  /**
   * Create a temp segment from current segment state
   */
  static createTempSegment(
    segmentId: string,
    startTimeMs: number,
    endTimeMs: number,
    audioLevel: number,
    sequenceId: string,
    projectId: string,
    segmentIndex: number
  ): TempSegment {
    const segmentDurationMs = endTimeMs - startTimeMs;
    const segmentDurationSeconds = segmentDurationMs / 1000;
    const now = new Date().toISOString();
    const relativePath = FilePathService.getRelativePath(sequenceId, segmentId);

    return {
      id: segmentId,
      local_file_path: relativePath,
      sequence_id: sequenceId,
      project_id: projectId,
      segment_index: segmentIndex,
      is_hidden: false,
      audio_level: audioLevel,
      duration_seconds: segmentDurationSeconds,
      start_time_ms: startTimeMs,
      end_time_ms: endTimeMs,
      recording_status: 'completed',
      created_at: now,
      updated_at: now,
    };
  }
}
