import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { networkService } from '@/shared/services/network';
import { locationService } from '@/shared/services/location/LocationService';
import { supabase } from '@/shared/services/api/supabase';
import { logger } from '@/shared/utils/logger';
import { generateUUID } from '@/shared/utils/uuid';

// Logging configuration for this module
const ENABLE_LOGGING = false;

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [lon, lat]
}

export type Nullable<T> = T | null;

const DEVICE_ID_KEY = 'analytics:device_id';
const INSTALL_SENT_KEY = 'analytics:install_sent'; // legacy (global)
const INSTALL_PENDING_KEY = 'analytics:install_pending';
function userInstallSentKey(userId: string) {
  return `${INSTALL_SENT_KEY}:${userId}`;
}
const SESSION_PENDING_KEY = 'analytics:session_pending';
const SESSION_STARTED_AT_KEY = 'analytics:session_started_at';

function stringifyGeo(geo: Nullable<GeoJSONPoint>): string | null {
  return geo ? JSON.stringify(geo) : null;
}

async function ensureDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = generateUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch (e) {
    logger.warn(
      ENABLE_LOGGING,
      'Analytics: failed to read/store device id, generating volatile id',
      e
    );
    return generateUUID();
  }
}

async function getUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function getConnectivityLabel(): Promise<
  'wifi' | 'cellular' | 'offline' | 'unknown'
> {
  try {
    const ns = await networkService.getNetworkState();
    if (!ns.isConnected || ns.isInternetReachable === false) return 'offline';
    if (ns.connectionType === 'wifi') return 'wifi';
    if (ns.connectionType === 'cellular') return 'cellular';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export interface EnrichedGeoLocation {
  location: GeoJSONPoint;
  countryCode?: string | undefined;
  regionCode?: string | undefined;
  continentCode?: string | undefined;
  locationSource: 'device' | 'ip';
}

async function getGeoJSONPoint(): Promise<Nullable<GeoJSONPoint>> {
  try {
    // Ensure service awareness and latest state
    await locationService.checkPermissionStatus();
    await locationService.checkLocationServices();

    const last = locationService.getLastKnownLocation();
    const loc = last ?? (await locationService.getApproximateLocation());
    if (!loc) return null;
    return {
      type: 'Point',
      coordinates: [Number(loc.longitude), Number(loc.latitude)],
    };
  } catch {
    return null;
  }
}

async function getEnrichedGeoLocation(): Promise<
  Nullable<EnrichedGeoLocation>
> {
  try {
    // Ensure service awareness and latest state
    await locationService.checkPermissionStatus();
    await locationService.checkLocationServices();

    const last = locationService.getLastKnownLocation();
    const loc = last ?? (await locationService.getApproximateLocation());
    if (!loc) return null;

    const location: GeoJSONPoint = {
      type: 'Point',
      coordinates: [Number(loc.longitude), Number(loc.latitude)],
    };

    // Attempt reverse geocoding to get administrative region data
    try {
      const { reverseGeocodeAsync } = await import('expo-location');
      const geocoded = await reverseGeocodeAsync({
        latitude: loc.latitude,
        longitude: loc.longitude,
      });

      if (geocoded && geocoded.length > 0) {
        const address = geocoded[0];

        // Extract administrative region data
        const countryCode = address?.isoCountryCode?.toUpperCase();
        const regionCode = address?.region || address?.subregion;

        // Map country to continent (you could use a lookup table or library)
        const continentCode = undefined;

        return {
          location,
          countryCode,
          regionCode: regionCode || undefined,
          continentCode,
          locationSource: 'device',
        };
      }
    } catch (reverseGeocodeError) {
      logger.warn(
        ENABLE_LOGGING,
        'Analytics: reverse geocoding failed',
        reverseGeocodeError
      );
    }

    // Fallback to basic location without administrative data
    return {
      location,
      locationSource: 'device',
    };
  } catch {
    return null;
  }
}

function getAppEnv() {
  const nativeAppVersion = (Constants as Record<string, unknown>)[
    'nativeAppVersion'
  ] as string | undefined;
  const appVersion =
    Constants.expoConfig?.version || nativeAppVersion || 'unknown';
  const os = Platform.OS;
  const osVersion = Device.osVersion ?? 'unknown';
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  return { appVersion, os, osVersion, platform };
}

class AnalyticsServiceImpl {
  private currentSessionId: string | null = null;
  private currentSessionStartedAt: string | null = null;
  private initialized = false;
  private lastBackfillUserId: string | null = null;
  private pendingChapterListens: Array<{
    chapterId: string;
    languageEntityId: string | null;
  }> = [];
  private pendingMediaFileListens: Array<{ mediaFileId: string }> = [];

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      // Nothing heavy right now; ensure a device id exists early
      await ensureDeviceId();
      // Attempt immediate backfill if a session already exists
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id ?? null;
        if (uid) {
          await this.backfillUserIdIfNeeded(uid);
          // If install was pending waiting for a session, send it now (per-user)
          const pending = await AsyncStorage.getItem(INSTALL_PENDING_KEY);
          const sentKey = userInstallSentKey(uid);
          const alreadySent = await AsyncStorage.getItem(sentKey);
          if (pending && !alreadySent) {
            await this.recordAppInstallOnce();
          }
        }
      } catch {
        // ignore
      }
      // Subscribe to auth changes to backfill user_id when session becomes available
      try {
        supabase.auth.onAuthStateChange(async (_event, session) => {
          const uid = session?.user?.id ?? null;
          if (uid) {
            await this.backfillUserIdIfNeeded(uid);
            const pending = await AsyncStorage.getItem(INSTALL_PENDING_KEY);
            const sentKey = userInstallSentKey(uid);
            const alreadySent = await AsyncStorage.getItem(sentKey);
            if (pending && !alreadySent) {
              await this.recordAppInstallOnce();
            }
            // If session creation was pending, resume it using original start timestamp
            const sessionPending =
              await AsyncStorage.getItem(SESSION_PENDING_KEY);
            if (sessionPending === '1') {
              const startedAt =
                (await AsyncStorage.getItem(SESSION_STARTED_AT_KEY)) ||
                undefined;
              await this.recordSessionStart(startedAt || undefined);
              await AsyncStorage.multiRemove([
                SESSION_PENDING_KEY,
                SESSION_STARTED_AT_KEY,
              ]);
            }
          }
        });
      } catch {
        // ignore
      }
      this.initialized = true;
    } catch (e) {
      logger.warn(ENABLE_LOGGING, 'Analytics: initialize failed', e);
    }
  }

  /**
   * After permissions are granted (or later), enrich current session and latest install with location.
   */
  async attemptLocationEnrichment(): Promise<void> {
    try {
      if (!powerSyncSystem.isInitialized) return;
      const enrichedGeo = await getEnrichedGeoLocation();
      if (!enrichedGeo) return;
      const geoStr = stringifyGeo(enrichedGeo.location);
      const deviceId = await ensureDeviceId();

      // Update current session with location and administrative region data
      const sessionId = this.currentSessionId;
      if (sessionId && geoStr) {
        await powerSyncSystem.execute(
          `UPDATE sessions SET 
             location = ?, 
             location_source = ?, 
             continent_code = ?, 
             country_code = ?, 
             region_code = ? 
           WHERE id = ?`,
          [
            geoStr,
            enrichedGeo.locationSource,
            enrichedGeo.continentCode || null,
            enrichedGeo.countryCode || null,
            enrichedGeo.regionCode || null,
            sessionId,
          ]
        );
      }

      // Update most recent app_downloads for this device if location is null
      const row = await powerSyncSystem.get(
        `SELECT id FROM app_downloads WHERE device_id = ? ORDER BY downloaded_at DESC LIMIT 1`,
        [deviceId]
      );
      const targetId = (row?.id as string) ?? null;
      if (targetId && geoStr) {
        await powerSyncSystem.execute(
          `UPDATE app_downloads SET location = ? WHERE id = ? AND (location IS NULL OR location = '')`,
          [geoStr, targetId]
        );
      }
    } catch (e) {
      logger.warn(ENABLE_LOGGING, 'Analytics: location enrichment failed', e);
    }
  }

  getSessionId(): string | null {
    return this.currentSessionId;
  }

  async recordAppInstallOnce(): Promise<void> {
    try {
      if (!powerSyncSystem.isInitialized) return;

      const [deviceId, userId, enrichedGeo] = await Promise.all([
        ensureDeviceId(),
        getUserId(),
        getEnrichedGeoLocation(),
      ]);
      if (!userId) {
        // No session yet; defer until we have one to satisfy RLS
        await AsyncStorage.setItem(INSTALL_PENDING_KEY, '1');
        return;
      }
      // Per-user sent flag
      const sentKey = userInstallSentKey(userId);
      const already = await AsyncStorage.getItem(sentKey);
      if (already) return;
      const ts = new Date().toISOString();
      const { appVersion, platform, os, osVersion } = getAppEnv();
      const id = generateUUID();

      await powerSyncSystem.execute(
        `INSERT INTO app_downloads (
           id, origin_share_id, user_id, device_id, downloaded_at, location,
           app_version, platform, os, os_version
         ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          deviceId,
          ts,
          stringifyGeo(enrichedGeo?.location ?? null),
          appVersion,
          platform,
          os,
          osVersion,
        ]
      );
      await AsyncStorage.multiSet([
        [sentKey, '1'],
        [INSTALL_PENDING_KEY, '0'],
      ]);
      logger.info(ENABLE_LOGGING, 'Analytics: app_downloads recorded');
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'Analytics: failed to record app download',
        e
      );
    }
  }

  async recordSessionStart(startedAtOverride?: string): Promise<string | null> {
    try {
      if (!powerSyncSystem.isInitialized) return null;
      const [, userId, enrichedGeo, connectivity] = await Promise.all([
        ensureDeviceId(),
        getUserId(),
        getEnrichedGeoLocation(),
        getConnectivityLabel(),
      ]);
      const ts = startedAtOverride ?? new Date().toISOString();
      // If no Supabase session yet, defer session creation and persist intended start time
      if (!userId) {
        await AsyncStorage.setItem(SESSION_PENDING_KEY, '1');
        await AsyncStorage.setItem(SESSION_STARTED_AT_KEY, ts);
        return null;
      }
      const { appVersion, platform, os, osVersion } = getAppEnv();
      const id = generateUUID();
      // Ensure app_download exists for this user (per-user)
      await this.recordAppInstallOnce();
      // Link to latest app_download for this user if present
      let appDownloadId: string | null = null;
      try {
        const row = await powerSyncSystem.get(
          `SELECT id FROM app_downloads WHERE user_id = ? ORDER BY downloaded_at DESC LIMIT 1`,
          [userId]
        );
        appDownloadId = (row?.id as string) ?? null;
      } catch {
        appDownloadId = null;
      }

      await powerSyncSystem.execute(
        `INSERT INTO sessions (
           id, user_id, started_at, ended_at, connectivity, location,
           platform, app_version, os, os_version, app_download_id,
           location_source, continent_code, country_code, region_code
         ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          ts,
          connectivity,
          stringifyGeo(enrichedGeo?.location ?? null),
          platform,
          appVersion,
          os,
          osVersion,
          appDownloadId,
          enrichedGeo?.locationSource || null,
          enrichedGeo?.continentCode || null,
          enrichedGeo?.countryCode || null,
          enrichedGeo?.regionCode || null,
        ]
      );
      this.currentSessionId = id;
      this.currentSessionStartedAt = ts;
      // Backfill any earlier sessions for this user missing app_download_id
      try {
        if (appDownloadId) {
          await powerSyncSystem.execute(
            `UPDATE sessions SET app_download_id = ? WHERE user_id = ? AND app_download_id IS NULL`,
            [appDownloadId, userId]
          );
        }
      } catch {
        // ignore
      }
      await AsyncStorage.multiRemove([
        SESSION_PENDING_KEY,
        SESSION_STARTED_AT_KEY,
      ]);
      // Flush any events queued while session was pending
      await this.flushPendingEvents();
      return id;
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'Analytics: failed to record session start',
        e
      );
      return null;
    }
  }

  private async ensureSession(): Promise<string | null> {
    if (this.currentSessionId) return this.currentSessionId;
    return this.recordSessionStart();
  }

  /**
   * End the current session by setting ended_at on the server via Edge Function.
   * Does not update the local sessions row to avoid generating PATCH uploads.
   */
  async endCurrentSession(): Promise<void> {
    try {
      const sessionId = this.currentSessionId;
      if (!sessionId) return;
      // Invoke Edge Function to close the session with proper auth context
      const endedAt = new Date().toISOString();
      // Debug log payload
      logger.info(ENABLE_LOGGING, 'close-session payload', {
        session_id: sessionId,
        ended_at: endedAt,
        started_at: this.currentSessionStartedAt || undefined,
      });
      const { error } = await supabase.functions.invoke('close-session', {
        body: {
          session_id: sessionId,
          ended_at: endedAt,
          started_at: this.currentSessionStartedAt || undefined,
        },
      });
      if (error) throw error;
      // Clear current session id locally; next foreground will create a new session
      this.currentSessionId = null;
      this.currentSessionStartedAt = null;
    } catch (e) {
      logger.warn(ENABLE_LOGGING, 'Analytics: failed to end session', e);
    }
  }

  private async flushPendingEvents(): Promise<void> {
    try {
      const sessionId = this.currentSessionId;
      if (!sessionId) return;
      // Drain chapter listens
      const chapters = [...this.pendingChapterListens];
      this.pendingChapterListens = [];
      for (const item of chapters) {
        // Best-effort replay; do not await sequentially to avoid blocking
        void this.recordChapterListen(
          item.chapterId,
          item.languageEntityId ?? null
        );
      }
      // Drain media listens
      const medias = [...this.pendingMediaFileListens];
      this.pendingMediaFileListens = [];
      for (const item of medias) {
        void this.recordMediaFileListen(item.mediaFileId);
      }
    } catch {
      // ignore
    }
  }

  async recordChapterListen(
    chapterId: string,
    languageEntityId?: string | null
  ): Promise<void> {
    try {
      if (!chapterId || !powerSyncSystem.isInitialized) return;
      const [sessionId, , userId] = await Promise.all([
        this.ensureSession(),
        ensureDeviceId(),
        getUserId(),
        getGeoJSONPoint(),
        getConnectivityLabel(),
      ]);
      if (!sessionId) {
        this.pendingChapterListens.push({
          chapterId,
          languageEntityId: languageEntityId ?? null,
        });
        return;
      }
      let langId: string | null = languageEntityId ?? null;
      if (!langId) {
        const row = await powerSyncSystem.get(
          `SELECT mf.language_entity_id FROM media_files mf WHERE mf.chapter_id = ? AND mf.deleted_at IS NULL ORDER BY mf.created_at ASC LIMIT 1`,
          [chapterId]
        );
        langId = (row?.language_entity_id as string) ?? null;
      }
      if (!langId) {
        // Cannot satisfy NOT NULL language_entity_id constraint; skip
        return;
      }
      const ts = new Date().toISOString();
      const id = generateUUID();
      await powerSyncSystem.execute(
        `INSERT INTO chapter_listens (
           id, session_id, chapter_id, language_entity_id, listened_at,
           user_id, origin_share_id
         ) VALUES (?, ?, ?, ?, ?, ?, NULL)`,
        [id, sessionId, chapterId, langId, ts, userId]
      );
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'Analytics: failed to record chapter listen',
        e
      );
    }
  }

  async recordMediaFileListen(mediaFileId: string): Promise<void> {
    try {
      if (!mediaFileId || !powerSyncSystem.isInitialized) return;
      const [sessionId, , userId, , , mfRow] = await Promise.all([
        this.ensureSession(),
        ensureDeviceId(),
        getUserId(),
        getGeoJSONPoint(),
        getConnectivityLabel(),
        powerSyncSystem.get(
          `SELECT language_entity_id, duration_seconds, audio_version_id FROM media_files WHERE id = ? LIMIT 1`,
          [mediaFileId]
        ),
      ]);
      if (!sessionId) {
        this.pendingMediaFileListens.push({ mediaFileId });
        return;
      }
      const ts = new Date().toISOString();
      const id = generateUUID();
      let languageEntityId: string | null =
        (mfRow?.language_entity_id as string) ?? null;
      if (!languageEntityId) {
        const avId = (mfRow?.audio_version_id as string) ?? null;
        if (avId) {
          const v = await powerSyncSystem.get(
            `SELECT language_entity_id FROM version_language_lookup WHERE version_type = 'audio' AND version_id = ? LIMIT 1`,
            [avId]
          );
          languageEntityId = (v?.language_entity_id as string) ?? null;
        }
      }
      if (!languageEntityId) return;
      const durationSeconds: number = Math.max(
        1,
        Number(mfRow?.duration_seconds ?? 0)
      );
      await powerSyncSystem.execute(
        `INSERT INTO media_file_listens (
           id, user_id, session_id, media_file_id, language_entity_id,
           position_seconds, duration_seconds, listened_at, origin_share_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [
          id,
          userId,
          sessionId,
          mediaFileId,
          languageEntityId,
          0,
          durationSeconds,
          ts,
        ]
      );
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'Analytics: failed to record media file listen',
        e
      );
    }
  }

  private async backfillUserIdIfNeeded(userId: string): Promise<void> {
    try {
      if (!powerSyncSystem.isInitialized) return;
      if (!userId) return;
      if (this.lastBackfillUserId === userId) return;

      const deviceId = await ensureDeviceId();
      // Backfill per-table using available keys
      // app_downloads has device_id, others do not in the local schema
      await powerSyncSystem.execute(
        `UPDATE app_downloads SET user_id = ? WHERE user_id IS NULL AND device_id = ?`,
        [userId, deviceId]
      );
      for (const table of [
        'sessions',
        'chapter_listens',
        'media_file_listens',
        'share_opens',
      ]) {
        await powerSyncSystem.execute(
          `UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`,
          [userId]
        );
      }
      this.lastBackfillUserId = userId;
      // logger.info(ENABLE_LOGGING, 'Analytics: backfilled user_id on analytics tables');
    } catch (e) {
      logger.warn(ENABLE_LOGGING, 'Analytics: failed to backfill user_id', e);
    }
  }
}

export const AnalyticsService = new AnalyticsServiceImpl();
