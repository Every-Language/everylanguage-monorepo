import { useCallback } from 'react';
import { Alert } from 'react-native';
import { ShareService } from '../services/ShareService';
import { useAuthStore } from '@/shared/store/authStore';
import { AnalyticsService } from '@/features/analytics/services/AnalyticsService';

interface ShareOptions {
  type: 'verse' | 'chapter' | 'book';
  entityId: string;
  shareType?: 'audio' | 'text';
  audioVersionId?: string;
  textVersionId?: string;
  customText?: string;
  title?: string;
  isVersionAgnostic?: boolean;
}

interface ShareResult {
  success: boolean;
  shareId?: string;
  error?: string;
}

export const useShare = () => {
  const userId = useAuthStore(state => state.userId || undefined) as
    | string
    | undefined;
  const sessionId = (AnalyticsService.getSessionId?.() || undefined) as
    | string
    | undefined;

  const shareContent = useCallback(
    async (options: ShareOptions): Promise<ShareResult> => {
      try {
        const shareService = new ShareService(userId, sessionId);

        const result = await shareService.shareContent(options);

        if (result) {
          return {
            success: true,
            shareId: result.shareId,
          };
        } else {
          return {
            success: false,
            error: 'User cancelled sharing',
          };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';

        Alert.alert(
          'Share Failed',
          `Sorry, we couldn't share this content. ${errorMessage}`,
          [{ text: 'OK' }]
        );

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [userId, sessionId]
  );

  const shareVerse = useCallback(
    async (
      verseId: string,
      options?: Omit<ShareOptions, 'type' | 'entityId'>
    ): Promise<ShareResult> => {
      return shareContent({
        type: 'verse',
        entityId: verseId,
        ...options,
      });
    },
    [shareContent]
  );

  const shareChapter = useCallback(
    async (
      chapterId: string,
      options?: Omit<ShareOptions, 'type' | 'entityId'>
    ): Promise<ShareResult> => {
      return shareContent({
        type: 'chapter',
        entityId: chapterId,
        ...options,
      });
    },
    [shareContent]
  );

  const shareBook = useCallback(
    async (
      bookId: string,
      options?: Omit<ShareOptions, 'type' | 'entityId'>
    ): Promise<ShareResult> => {
      return shareContent({
        type: 'book',
        entityId: bookId,
        ...options,
      } as ShareOptions);
    },
    [shareContent]
  );

  return {
    shareContent,
    shareVerse,
    shareChapter,
    shareBook,
  };
};

export default useShare;
