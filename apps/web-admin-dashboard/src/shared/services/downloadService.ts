import { supabase } from './supabase';

export interface DownloadUrlsResponse {
  success: boolean;
  expiresIn: number;
  media?: Record<string, string>;
  images?: Record<string, string>;
  projectUpdatesMedia?: Record<string, string>;
  errors?: Record<string, string>;
}

export class DownloadService {
  /**
   * Get presigned download URLs by media/image IDs
   */
  async getDownloadUrlsById(params: {
    mediaFileIds?: string[];
    imageIds?: string[];
    projectUpdatesMediaIds?: string[];
    expirationHours?: number;
  }): Promise<DownloadUrlsResponse> {
    const {
      mediaFileIds = [],
      imageIds = [],
      projectUpdatesMediaIds = [],
      expirationHours = 24,
    } = params;

    if (
      mediaFileIds.length === 0 &&
      imageIds.length === 0 &&
      projectUpdatesMediaIds.length === 0
    ) {
      throw new Error(
        'Provide at least one mediaFileId, imageId, or projectUpdatesMediaId'
      );
    }

    const { data, error } = await supabase.functions.invoke(
      'get-download-urls-by-id',
      {
        body: {
          mediaFileIds,
          imageIds,
          projectUpdatesMediaIds,
          expirationHours,
        },
      }
    );

    if (error) {
      throw new Error(error.message || 'Failed to get download URLs');
    }

    // Handle the response structure from supabase.functions.invoke() - data is wrapped in a 'data' property
    const functionResponse = data?.data;
    if (!functionResponse) {
      throw new Error('Invalid response format from Edge function');
    }

    return functionResponse;
  }

  /**
   * Download a file from a presigned URL
   */
  async downloadFile(signedUrl: string, filename: string): Promise<void> {
    try {
      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }
}

export const downloadService = new DownloadService();
