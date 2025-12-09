import React, { useCallback, useState, useRef } from 'react';
import { Button, Input } from '@/shared/design-system';
import { XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { cn } from '@/shared/design-system/utils';
import type { MediaFileWithPreview } from '../types';

interface MediaUploaderProps {
  files: MediaFileWithPreview[];
  onFilesChange: (files: MediaFileWithPreview[]) => void;
  onCaptionChange?: (index: number, caption: string) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  className?: string;
  disabled?: boolean;
}

const IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  files,
  onFilesChange,
  onCaptionChange,
  maxFiles = 10,
  maxSize: _maxSize = MAX_VIDEO_SIZE, // eslint-disable-line @typescript-eslint/no-unused-vars
  className,
  disabled = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectMediaType = useCallback((file: File): 'image' | 'video' => {
    if (IMAGE_TYPES.includes(file.type)) {
      return 'image';
    }
    if (VIDEO_TYPES.includes(file.type)) {
      return 'video';
    }
    // Fallback based on extension
    const ext = file.name.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return 'image';
    }
    return 'video';
  }, []);

  const createPreview = useCallback(
    (file: File, mediaType: 'image' | 'video'): Promise<string | undefined> => {
      return new Promise(resolve => {
        if (mediaType === 'image') {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target?.result as string);
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(file);
        } else {
          // For videos, we could create a thumbnail, but for now just return undefined
          resolve(undefined);
        }
      });
    },
    []
  );

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return `File type ${file.type} is not allowed. Supported: images (jpg, png, gif, webp) and videos (mp4, webm)`;
      }

      const mediaType = detectMediaType(file);
      const maxSizeForType =
        mediaType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;

      if (file.size > maxSizeForType) {
        return `File size exceeds ${Math.round(maxSizeForType / 1024 / 1024)}MB limit for ${mediaType}s`;
      }

      return null;
    },
    [detectMediaType]
  );

  const handleFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const validFiles: MediaFileWithPreview[] = [];
      let errorMsg: string | null = null;

      if (files.length + fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      for (const file of fileArray) {
        const validation = validateFile(file);
        if (validation) {
          errorMsg = validation;
          break;
        }

        const mediaType = detectMediaType(file);
        const preview = await createPreview(file, mediaType);

        validFiles.push({
          file,
          preview,
          mediaType,
          displayOrder: files.length + validFiles.length,
        });
      }

      if (errorMsg) {
        setError(errorMsg);
        return;
      }

      setError(null);
      onFilesChange([...files, ...validFiles]);
    },
    [
      files,
      maxFiles,
      validateFile,
      detectMediaType,
      createPreview,
      onFilesChange,
    ]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled || !e.dataTransfer.files) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || !e.target.files) return;
      handleFiles(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [disabled, handleFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = files.filter((_, i) => i !== index);
      // Update display orders
      const reorderedFiles = newFiles.map((f, i) => ({
        ...f,
        displayOrder: i,
      }));
      onFilesChange(reorderedFiles);
    },
    [files, onFilesChange]
  );

  const moveFile = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newFiles = [...files];
      const [moved] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, moved);
      // Update display orders
      const reorderedFiles = newFiles.map((f, i) => ({
        ...f,
        displayOrder: i,
      }));
      onFilesChange(reorderedFiles);
    },
    [files, onFilesChange]
  );

  const openFileDialog = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Zone */}
      {files.length < maxFiles && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg transition-colors cursor-pointer p-6',
            dragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20'
              : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}>
          <div className='text-center'>
            <ArrowUpTrayIcon className='mx-auto h-12 w-12 text-neutral-400' />
            <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
              Drop files here or click to upload
            </p>
            <p className='text-xs text-neutral-500 dark:text-neutral-500 mt-1'>
              Images (JPG, PNG, GIF, WebP) up to 10MB • Videos (MP4, WebM) up to
              100MB
            </p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type='file'
        accept={ALLOWED_TYPES.join(',')}
        multiple
        onChange={handleInputChange}
        className='hidden'
        disabled={disabled}
      />

      {/* File Preview Grid */}
      {files.length > 0 && (
        <div className='space-y-4'>
          <div className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
            Media Files ({files.length}/{maxFiles})
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {files.map((fileWithPreview, index) => (
              <div
                key={index}
                className='border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 space-y-2'>
                {/* Preview */}
                <div className='relative aspect-video bg-neutral-100 dark:bg-neutral-800 rounded overflow-hidden'>
                  {fileWithPreview.preview ? (
                    <img
                      src={fileWithPreview.preview}
                      alt={fileWithPreview.file.name}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <div className='w-full h-full flex items-center justify-center'>
                      <div className='text-center'>
                        <svg
                          className='mx-auto h-12 w-12 text-neutral-400'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'>
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                          />
                        </svg>
                        <p className='text-xs text-neutral-500 mt-1'>Video</p>
                      </div>
                    </div>
                  )}
                  <button
                    type='button'
                    onClick={() => removeFile(index)}
                    className='absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600'
                    disabled={disabled}>
                    <XMarkIcon className='h-4 w-4' />
                  </button>
                </div>

                {/* File Info */}
                <div className='text-xs text-neutral-500 truncate'>
                  {fileWithPreview.file.name}
                </div>
                <div className='text-xs text-neutral-400'>
                  {(fileWithPreview.file.size / 1024 / 1024).toFixed(2)} MB •{' '}
                  {fileWithPreview.mediaType}
                </div>

                {/* Caption Input */}
                <Input
                  placeholder='Add caption (optional)'
                  value={fileWithPreview.caption || ''}
                  onChange={e => {
                    const newFiles = [...files];
                    newFiles[index] = {
                      ...fileWithPreview,
                      caption: e.target.value,
                    };
                    onFilesChange(newFiles);
                    onCaptionChange?.(index, e.target.value);
                  }}
                  size='sm'
                  disabled={disabled}
                />

                {/* Reorder Buttons */}
                {files.length > 1 && (
                  <div className='flex gap-2'>
                    {index > 0 && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => moveFile(index, index - 1)}
                        disabled={disabled}>
                        ↑
                      </Button>
                    )}
                    {index < files.length - 1 && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => moveFile(index, index + 1)}
                        disabled={disabled}>
                        ↓
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className='bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-4'>
          <p className='text-sm text-red-800 dark:text-red-200'>{error}</p>
        </div>
      )}
    </div>
  );
};
