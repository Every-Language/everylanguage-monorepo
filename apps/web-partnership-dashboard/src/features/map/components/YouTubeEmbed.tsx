import React, { useState } from 'react';
import { PlayIcon } from '@heroicons/react/24/solid';

export interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
  /**
   * If true, always show thumbnail preview instead of attempting to embed.
   * Useful when embedding is known to be disabled.
   */
  useThumbnailOnly?: boolean;
}

/**
 * Extracts YouTube video ID from various YouTube URL formats
 */
function extractYouTubeVideoId(urlOrId: string): string | null {
  // If it's already just an ID (11 characters, alphanumeric)
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
    return urlOrId;
  }

  // Try to extract from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = urlOrId.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Gets YouTube thumbnail URL for a video ID
 */
function getYouTubeThumbnail(
  videoId: string,
  quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'
): string {
  // YouTube thumbnail URL format: https://img.youtube.com/vi/{videoId}/{quality}default.jpg
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault',
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Gets YouTube watch URL for a video ID
 */
function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * YouTube thumbnail preview component
 * Shows a clickable thumbnail that links to YouTube
 */
const YouTubeThumbnailPreview: React.FC<{
  videoId: string;
  title?: string;
}> = ({ videoId, title }) => {
  const watchUrl = getYouTubeWatchUrl(videoId);
  const thumbnailUrl = getYouTubeThumbnail(videoId, 'high');

  return (
    <div className='space-y-2'>
      {title && (
        <div className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
          {title}
        </div>
      )}
      <a
        href={watchUrl}
        target='_blank'
        rel='noopener noreferrer'
        className='block relative group'
      >
        <div
          className='relative w-full rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800'
          style={{ paddingBottom: '56.25%' }}
        >
          <img
            src={thumbnailUrl}
            alt={title || 'YouTube video thumbnail'}
            className='absolute top-0 left-0 w-full h-full object-cover'
            onError={e => {
              // Fallback to default thumbnail if image fails to load
              e.currentTarget.src = getYouTubeThumbnail(videoId, 'default');
            }}
          />
          {/* Play button overlay */}
          <div className='absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors'>
            <div className='bg-red-600 rounded-full p-4 group-hover:bg-red-700 transition-colors'>
              <PlayIcon className='w-8 h-8 text-white ml-1' />
            </div>
          </div>
        </div>
        <div className='text-xs text-neutral-500 dark:text-neutral-400 mt-1 text-center'>
          Click to watch on YouTube
        </div>
      </a>
    </div>
  );
};

/**
 * YouTube embed component
 * Attempts to embed a YouTube video using an iframe.
 * If embedding is disabled by the video owner, YouTube will show an error message.
 * In that case, you can use `useThumbnailOnly={true}` to show a thumbnail preview instead.
 *
 * Note: Due to CORS restrictions, we cannot reliably detect if embedding is disabled.
 * If you see "Video unavailable - Playback on other websites has been disabled",
 * consider using the thumbnail-only mode.
 */
export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  videoId,
  title,
  useThumbnailOnly = false,
}) => {
  const extractedId = extractYouTubeVideoId(videoId);
  const [showThumbnail, setShowThumbnail] = useState(useThumbnailOnly);

  if (!extractedId) {
    return (
      <div className='text-sm text-neutral-500'>Invalid YouTube video ID</div>
    );
  }

  // If thumbnail-only mode or user manually switched to thumbnail, show preview
  if (showThumbnail) {
    return <YouTubeThumbnailPreview videoId={extractedId} title={title} />;
  }

  const embedUrl = `https://www.youtube.com/embed/${extractedId}`;

  return (
    <div className='space-y-2'>
      {title && (
        <div className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
          {title}
        </div>
      )}
      <div className='relative w-full' style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={embedUrl}
          title={title || 'YouTube video'}
          className='absolute top-0 left-0 w-full h-full rounded-lg'
          allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
          allowFullScreen
        />
        {/* Fallback button to switch to thumbnail if embedding fails */}
        <div className='absolute top-2 right-2'>
          <button
            onClick={() => setShowThumbnail(true)}
            className='text-xs px-2 py-1 bg-black/50 hover:bg-black/70 text-white rounded transition-colors'
            title="If video doesn't play, click to view thumbnail"
          >
            View on YouTube
          </button>
        </div>
      </div>
    </div>
  );
};
