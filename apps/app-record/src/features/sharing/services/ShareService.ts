import { Share, ShareContent } from 'react-native';
import * as Linking from 'expo-linking';
import uuid from 'react-native-uuid';
import { powerSyncSystem } from '@/shared/services/powersync';
import { authService } from '@/features/auth';

interface ShareContentOptions {
  type: 'verse' | 'chapter' | 'book';
  entityId: string;
  /** Optional share type to drive deep link behavior. Defaults to 'text' if omitted. */
  shareType?: 'audio' | 'text';
  customText?: string;
  title?: string;
}

interface ShareMetadata {
  shareId: string;
  url: string;
  shareEntityType: 'verse' | 'chapter' | 'book';
  shareEntityId: string;
}

export class ShareService {
  private userId: string | undefined;
  private sessionId: string | undefined;

  constructor(
    userId: string | undefined = undefined,
    sessionId: string | undefined = undefined
  ) {
    this.userId = userId;
    this.sessionId = sessionId;
  }

  private createShareUrl(
    options: ShareContentOptions,
    shareId?: string
  ): string {
    const id = shareId ?? uuid.v4();
    const params = [`shareId=${encodeURIComponent(id)}`];
    if (options.shareType === 'audio' || options.shareType === 'text') {
      params.push(`shareType=${encodeURIComponent(options.shareType)}`);
    }
    const baseUrl = `everylanguage://${options.type}/${options.entityId}`;
    return `${baseUrl}?${params.join('&')}`;
  }

  // private createWebUrl(options: ShareContentOptions, shareId?: string): string {
  //   const baseUrl = `https://bible.everylanguage.com/${options.type}/${options.entityId}`;
  //   const params: string[] = [];
  //   if (shareId) params.push(`shareId=${encodeURIComponent(shareId)}`);
  //   if (options.shareType === 'audio' || options.shareType === 'text') {
  //     params.push(`shareType=${encodeURIComponent(options.shareType)}`);
  //   }
  //   return params.length > 0 ? `${baseUrl}?${params.join('&')}` : baseUrl;
  // }

  private async trackShareCreation(metadata: ShareMetadata): Promise<void> {
    try {
      await powerSyncSystem.execute(
        `
        INSERT INTO shares (
          id,
          user_id,
          session_id,
          shared_at,
          share_entity_type,
          share_entity_id,
          language_entity_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          metadata.shareId,
          this.userId || null,
          this.sessionId || null,
          new Date().toISOString(),
          metadata.shareEntityType,
          metadata.shareEntityId,
          null,
        ]
      );
    } catch {
      // swallow
    }
  }

  static async trackShareOpen(
    powerSync: typeof powerSyncSystem,
    shareId: string,
    _userId: string | undefined = undefined,
    _sessionId: string | undefined = undefined
  ): Promise<void> {
    try {
      // Try to ensure a session when online; remain offline-safe
      await authService.ensureSessionIfOnline();

      // Resolve user id from auth service if available (may be null offline)
      let resolvedUserId: string | null = null;
      try {
        resolvedUserId = await authService.getCurrentUserId();
      } catch {
        resolvedUserId = null;
      }

      // Optionally attach current analytics session id if available
      let resolvedSessionId: string | null = null;
      try {
        const { AnalyticsService } = await import('@/features/analytics');
        resolvedSessionId = AnalyticsService.getSessionId();
      } catch {
        // ignore
      }

      // Insert locally regardless; remote upload will be skipped until user_id exists (RLS)
      await powerSync.execute(
        `
        INSERT INTO share_opens (
          id,
          share_id,
          user_id,
          session_id,
          opened_at,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          uuid.v4(),
          shareId,
          resolvedUserId || null,
          resolvedSessionId || null,
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );
    } catch {
      // Silent failure - don't interrupt the app flow
    }
  }

  async shareContent(
    options: ShareContentOptions
  ): Promise<{ shareId: string } | null> {
    const shareId = uuid.v4();
    const url = this.createShareUrl({ ...options }, shareId);
    // const webUrl = this.createWebUrl(options, shareId); // not used per spec (no website link for now)

    const isAudio = options.shareType === 'audio';
    const actionWord = isAudio ? 'Listen to' : 'Read';

    let message = '';
    if (options.type === 'book') {
      // "{Read/Listen to} {bookname} in the Every Language Bible App: {{Link}}"
      message = `${actionWord} ${options.title || 'this book'} in the Every Language Bible App: ${url}`;
    } else if (options.type === 'chapter') {
      // "{Read/Listen to} {bookname} {chapternumber} in the Every Language Bible App: {{Link}}"
      message = `${actionWord} ${options.title || 'this chapter'} in the Every Language Bible App: ${url}`;
    } else if (options.type === 'verse') {
      // ""{versetext}" - {bookname} {chapternumber}:{versenumber}
      //
      // {Read/Listen to} {bookname} {chapternumber}:{versenumber} in the Every Language Bible App: {{Link}}"
      const header = options.customText ? options.customText : '""';
      message = `${header}\n\n${actionWord} ${options.title || 'this verse'} in the Every Language Bible App: ${url}`;
    }

    const shareContent: ShareContent = {
      title: options.title || 'EveryLanguage Bible',
      message,
      url,
    };

    const result = await Share.share(shareContent);
    if (result.action === Share.sharedAction) {
      const metadata: ShareMetadata = {
        shareId,
        url,
        shareEntityType: options.type,
        shareEntityId: options.entityId,
      };
      await this.trackShareCreation(metadata);
      return { shareId };
    }
    return null;
  }

  static parseShareUrl(url: string): {
    type: 'verse' | 'chapter' | 'book';
    entityId: string;
    shareId: string | undefined;
    shareType?: 'audio' | 'text';
  } | null {
    try {
      const parsed = Linking.parse(url);
      const rawPath = parsed.path || '';
      const pathParts = rawPath.split('/').filter(Boolean);

      let type: string | undefined;
      let entityId: string | undefined;

      if (pathParts.length === 2) {
        [type, entityId] = pathParts;
      } else if (
        pathParts.length === 1 &&
        typeof parsed.hostname === 'string'
      ) {
        // Handle custom scheme format like everylanguage://chapter/gen-1
        type = parsed.hostname;
        entityId = pathParts[0];
      }

      if (!type || !entityId) return null;
      if (
        (type !== 'verse' && type !== 'chapter' && type !== 'book') ||
        !entityId
      )
        return null;
      const queryParams = parsed.queryParams || {};
      const qpShareType = queryParams['shareType'];
      const shareType =
        qpShareType === 'audio' || qpShareType === 'text'
          ? (qpShareType as 'audio' | 'text')
          : undefined;
      return {
        type: type as 'verse' | 'chapter' | 'book',
        entityId,
        shareId:
          typeof queryParams['shareId'] === 'string'
            ? queryParams['shareId']
            : undefined,
        ...(shareType ? { shareType } : {}),
      } as {
        type: 'verse' | 'chapter' | 'book';
        entityId: string;
        shareId: string | undefined;
        shareType?: 'audio' | 'text';
      };
    } catch {
      return null;
    }
  }
}

export default ShareService;
