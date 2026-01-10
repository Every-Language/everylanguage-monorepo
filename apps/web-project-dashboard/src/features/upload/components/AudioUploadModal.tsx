import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  FileUpload,
  Button,
  LoadingSpinner,
  Select,
  SelectItem,
} from '../../../shared/design-system/components';
import { AudioFileRow } from './AudioFileRow';
import { useToast } from '../../../shared/design-system/hooks/useToast';
import { useCurrentProject } from '../../dashboard/hooks/useCurrentProject';
import {
  AudioFileProcessor,
  type ProcessedAudioFile,
} from '../../../shared/services/audioFileProcessor';
import {
  FILENAME_FORMAT_OPTIONS,
  type FilenameFormat,
} from '../../../shared/services/filenameParser';
import { useR2AudioUpload } from '../hooks/useR2AudioUpload';
import { supabase } from '../../../shared/services/supabase';
import { useQuery } from '@tanstack/react-query';
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline';

// Local storage key for saving the selected format
const FILENAME_FORMAT_STORAGE_KEY = 'audio-upload-filename-format';

// Audio file types supported
const SUPPORTED_AUDIO_TYPES = [
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/m4a',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
];

interface AudioUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
  selectedAudioVersionId: string; // Automatically use the selected audio version from the audio files page
}

export function AudioUploadModal({
  open,
  onOpenChange,
  onUploadComplete,
  selectedAudioVersionId,
}: AudioUploadModalProps) {
  const { project: selectedProject } = useCurrentProject();
  const [audioFiles, setAudioFiles] = useState<ProcessedAudioFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(
    null
  );

  // Filename format state - load from localStorage or null if not set
  const [filenameFormat, setFilenameFormat] = useState<FilenameFormat | null>(
    () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(FILENAME_FORMAT_STORAGE_KEY);
        return saved as FilenameFormat | null;
      }
      return null;
    }
  );

  // Track if format has ever been selected (for mandatory first-time selection)
  const hasFormatBeenSelected = filenameFormat !== null;

  // Clear files when modal opens/closes to prevent duplication
  useEffect(() => {
    // Always clear files when modal state changes
    setAudioFiles([]);
    setCurrentlyPlayingId(null);
  }, [open]); // Don't include audioFiles.length to prevent infinite loop

  // R2 upload functionality
  const {
    isUploading,
    handleUpload: handleR2Upload,
    uploadSummary,
  } = useR2AudioUpload();

  const { toast } = useToast();
  const audioProcessor = useRef(new AudioFileProcessor()).current;

  // Get the currently selected bible version from the audio files screen context
  // This should come from the table's currently selected bible version
  const { data: defaultBibleVersionId } = useQuery({
    queryKey: ['current-bible-version-for-upload'],
    queryFn: async () => {
      // Try to get the first available bible version as default
      const { data: bibleVersions, error } = await supabase
        .from('bible_versions')
        .select('id, name')
        .order('name')
        .limit(1);

      if (error) {
        console.error('Error fetching bible versions:', error);
        return null;
      }

      return bibleVersions?.[0]?.id || null;
    },
    enabled: !!selectedProject,
  });

  // Handle file processing
  const handleFilesAdded = useCallback(
    async (files: File[]) => {
      // Prevent duplicate processing if already in progress
      if (isProcessing) {
        return;
      }

      setIsProcessing(true);

      try {
        // Filter supported files
        const supportedFiles = files.filter(file =>
          SUPPORTED_AUDIO_TYPES.includes(file.type)
        );

        if (supportedFiles.length === 0) {
          toast({
            title: 'No supported files',
            description: 'Please select audio files (MP3, WAV, M4A, etc.)',
            variant: 'warning',
          });
          return;
        }

        if (supportedFiles.length !== files.length) {
          toast({
            title: 'Some files skipped',
            description: `${files.length - supportedFiles.length} unsupported files were skipped`,
            variant: 'warning',
          });
        }

        // Process files in batch (optimized with batch database queries)
        const processedFiles = await audioProcessor.processFiles(
          supportedFiles,
          defaultBibleVersionId || undefined,
          filenameFormat || 'auto'
        );

        // Add to existing files, but prevent duplicates based on file name and size
        setAudioFiles(prev => {
          // Filter out files that are already in the list (by name and size)
          const newFiles = processedFiles.filter(
            newFile =>
              !prev.some(
                existingFile =>
                  existingFile.name === newFile.name &&
                  existingFile.size === newFile.size
              )
          );

          return [...prev, ...newFiles];
        });

        toast({
          title: 'Files processed',
          description: `${processedFiles.length} files ready for upload`,
          variant: 'success',
        });
      } catch (error) {
        console.error('Error processing files:', error);
        toast({
          title: 'Processing failed',
          description: 'There was an error processing your files',
          variant: 'error',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [audioProcessor, defaultBibleVersionId, isProcessing, toast, filenameFormat]
  );

  // Update file with book/chapter/verse selections
  const updateFileSelection = useCallback(
    (fileId: string, updates: Partial<ProcessedAudioFile>) => {
      setAudioFiles(prev =>
        prev.map(file => (file.id === fileId ? { ...file, ...updates } : file))
      );
    },
    []
  );

  // Remove file from list
  const removeFile = useCallback(
    (fileId: string) => {
      setAudioFiles(prev => prev.filter(f => f.id !== fileId));

      if (currentlyPlayingId === fileId) {
        setCurrentlyPlayingId(null);
      }
    },
    [currentlyPlayingId]
  );

  // Handle upload using Cloudflare R2 direct upload
  const handleUpload = useCallback(async () => {
    if (!selectedProject) {
      toast({
        title: 'No project selected',
        description: 'Please select a project before uploading files',
        variant: 'error',
      });
      return;
    }

    if (!selectedAudioVersionId) {
      toast({
        title: 'Audio version required',
        description: 'Please select an audio version before uploading',
        variant: 'error',
      });
      return;
    }

    const validFiles = audioFiles.filter(
      f =>
        f.isValid &&
        f.selectedBookId &&
        f.selectedChapterId &&
        f.selectedStartVerseId &&
        f.selectedEndVerseId
    );

    if (validFiles.length === 0) {
      toast({
        title: 'No valid files to upload',
        description:
          'Please ensure all files have book, chapter, and verse selections',
        variant: 'warning',
      });
      return;
    }

    try {
      // Start R2 upload
      await handleR2Upload(validFiles, selectedAudioVersionId);

      // Close modal on successful upload initiation
      onOpenChange(false);

      // Call completion callback if provided
      onUploadComplete?.();
    } catch (error) {
      // Error handling is done in the hook
      void error;
    }
  }, [
    selectedProject,
    selectedAudioVersionId,
    audioFiles,
    handleR2Upload,
    onOpenChange,
    onUploadComplete,
    toast,
  ]);

  // Get files ready for upload count
  const filesReadyForUpload = audioFiles.filter(
    f =>
      f.isValid &&
      f.selectedBookId &&
      f.selectedChapterId &&
      f.selectedStartVerseId &&
      f.selectedEndVerseId
  ).length;

  // Don't allow modal to close while uploading
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && isUploading) {
        toast({
          title: 'Upload in progress',
          description: 'Please wait for the upload to complete before closing',
          variant: 'warning',
        });
        return;
      }
      onOpenChange(newOpen);
    },
    [isUploading, onOpenChange, toast]
  );

  // Handle format change and save to localStorage
  const handleFormatChange = useCallback(
    (format: string) => {
      const newFormat = format as FilenameFormat;
      setFilenameFormat(newFormat);
      localStorage.setItem(FILENAME_FORMAT_STORAGE_KEY, newFormat);

      // If files are already loaded, re-process them with the new format
      if (audioFiles.length > 0) {
        toast({
          title: 'Format changed',
          description:
            'Please re-add your files to apply the new filename format',
          variant: 'info',
        });
        setAudioFiles([]);
      }
    },
    [audioFiles.length, toast]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-6xl max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <CloudArrowUpIcon className='h-5 w-5 text-blue-600 dark:text-blue-400' />
            Upload Audio Files
          </DialogTitle>
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
            Upload audio recordings with automatic book, chapter, and verse
            detection
          </p>
        </DialogHeader>

        <div className='flex-1 min-h-0 overflow-y-auto space-y-6 p-1'>
          {/* Instructions Header */}
          <div className='bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4'>
            <div className='flex items-start gap-3'>
              <InformationCircleIcon className='h-6 w-6 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0' />
              <div>
                <h3 className='text-base font-semibold text-blue-900 dark:text-blue-100'>
                  How to Name Your Audio Files
                </h3>
                <p className='text-sm text-blue-700 dark:text-blue-300 mt-1'>
                  For automatic parsing of book, chapter, and verses, name your
                  files using one of the supported formats below. Files with
                  book numbers (e.g., 01 for Genesis) provide the most reliable
                  matching.
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: Choose Format */}
          <div className='space-y-3'>
            <div className='flex items-center gap-3'>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                  hasFormatBeenSelected
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                }`}>
                {hasFormatBeenSelected ? (
                  <CheckCircleIcon className='h-5 w-5' />
                ) : (
                  '1'
                )}
              </div>
              <div className='flex-1'>
                <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2'>
                  <DocumentTextIcon className='h-4 w-4 text-gray-500 dark:text-gray-400' />
                  Choose Filename Format
                  {!hasFormatBeenSelected && (
                    <span className='text-xs font-normal text-red-500 ml-2'>
                      Required
                    </span>
                  )}
                </h3>
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  Select the naming pattern that matches your audio files
                </p>
              </div>
            </div>

            {/* Format Dropdown */}
            <div className='ml-11 space-y-3 max-w-md'>
              <Select
                value={filenameFormat || undefined}
                onValueChange={handleFormatChange}
                placeholder='Select filename format...'>
                {FILENAME_FORMAT_OPTIONS.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    <div className='flex flex-col py-1'>
                      <span className='font-medium'>{option.name}</span>
                      <span className='text-xs text-gray-500 dark:text-gray-400'>
                        Example: {option.example}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </Select>

              {/* Selected format details */}
              {filenameFormat && (
                <div className='bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3'>
                  <div className='flex items-start gap-3'>
                    <MusicalNoteIcon className='h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0' />
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-medium text-gray-700 dark:text-gray-300'>
                        Pattern:
                      </p>
                      <code className='text-xs text-gray-600 dark:text-gray-400 font-mono'>
                        {
                          FILENAME_FORMAT_OPTIONS.find(
                            o => o.id === filenameFormat
                          )?.description
                        }
                      </code>
                      <p className='text-xs font-medium text-gray-700 dark:text-gray-300 mt-2'>
                        Example:
                      </p>
                      <code className='text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded'>
                        {
                          FILENAME_FORMAT_OPTIONS.find(
                            o => o.id === filenameFormat
                          )?.example
                        }
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Upload Files */}
          <div className='space-y-4'>
            <div className='flex items-center gap-3'>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                  audioFiles.length > 0
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : hasFormatBeenSelected
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}>
                {audioFiles.length > 0 ? (
                  <CheckCircleIcon className='h-5 w-5' />
                ) : (
                  '2'
                )}
              </div>
              <div className='flex-1'>
                <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2'>
                  <CloudArrowUpIcon className='h-4 w-4 text-gray-500 dark:text-gray-400' />
                  Drag & Drop Audio Files
                </h3>
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  Files will be automatically parsed based on the selected
                  format
                </p>
              </div>
            </div>

            <div className='ml-11'>
              <FileUpload
                multiple
                accept={SUPPORTED_AUDIO_TYPES.join(',')}
                onFilesChange={handleFilesAdded}
                disabled={isProcessing || isUploading || !hasFormatBeenSelected}
                allowedTypes={SUPPORTED_AUDIO_TYPES}
                uploadText={
                  !hasFormatBeenSelected
                    ? 'Please select a filename format first'
                    : isProcessing
                      ? 'Processing files...'
                      : 'Drop audio files here or click to browse'
                }
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  !hasFormatBeenSelected
                    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
                maxFiles={50}
                maxSize={500 * 1024 * 1024} // 500MB
              />

              {/* Supported formats hint */}
              <p className='text-xs text-gray-400 dark:text-gray-500 mt-2 text-center'>
                Supported: MP3, WAV, M4A, AAC, OGG, WebM • Max 50 files • 500MB
                per file
              </p>
            </div>
          </div>

          {/* Step 3: Review Files (only shown when files are added) */}
          {audioFiles.length > 0 && (
            <div className='space-y-4'>
              <div className='flex items-center gap-3'>
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    filesReadyForUpload === audioFiles.length
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  }`}>
                  {filesReadyForUpload === audioFiles.length ? (
                    <CheckCircleIcon className='h-5 w-5' />
                  ) : (
                    '3'
                  )}
                </div>
                <div className='flex-1'>
                  <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2'>
                    <CheckCircleIcon className='h-4 w-4 text-gray-500 dark:text-gray-400' />
                    Review & Confirm
                  </h3>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Verify auto-detected book, chapter, and verse information
                  </p>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='text-right'>
                    <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                      {filesReadyForUpload} / {audioFiles.length}
                    </span>
                    <span className='text-xs text-gray-500 dark:text-gray-400 ml-1'>
                      ready
                    </span>
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setAudioFiles([])}
                    disabled={isUploading}>
                    Clear All
                  </Button>
                </div>
              </div>

              <div className='ml-11 space-y-2'>
                {audioFiles.map(file => (
                  <AudioFileRow
                    key={file.id}
                    file={file}
                    isPlaying={currentlyPlayingId === file.id}
                    onPlay={() => setCurrentlyPlayingId(file.id)}
                    onPause={() => setCurrentlyPlayingId(null)}
                    onDelete={() => removeFile(file.id)}
                    onBookChange={bookId =>
                      updateFileSelection(file.id, { selectedBookId: bookId })
                    }
                    onChapterChange={chapterId =>
                      updateFileSelection(file.id, {
                        selectedChapterId: chapterId,
                      })
                    }
                    onStartVerseChange={verseId =>
                      updateFileSelection(file.id, {
                        selectedStartVerseId: verseId,
                      })
                    }
                    onEndVerseChange={verseId =>
                      updateFileSelection(file.id, {
                        selectedEndVerseId: verseId,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className='flex items-center justify-between w-full'>
            <div className='text-sm text-gray-600 dark:text-gray-400'>
              {uploadSummary && (
                <span>
                  Upload: {uploadSummary.completed}/{uploadSummary.total}{' '}
                  completed
                  {uploadSummary.failed > 0 &&
                    `, ${uploadSummary.failed} failed`}
                </span>
              )}
            </div>
            <div className='flex space-x-2'>
              <DialogClose asChild>
                <Button variant='outline' disabled={isUploading}>
                  {isUploading ? 'Upload in Progress...' : 'Cancel'}
                </Button>
              </DialogClose>
              <Button
                onClick={handleUpload}
                disabled={
                  isUploading ||
                  isProcessing ||
                  filesReadyForUpload === 0 ||
                  !selectedAudioVersionId
                }
                className='flex items-center space-x-2'>
                {isUploading && <LoadingSpinner size='sm' />}
                <span>
                  {isUploading
                    ? 'Uploading...'
                    : `Upload ${filesReadyForUpload} Files`}
                </span>
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
