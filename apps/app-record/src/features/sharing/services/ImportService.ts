import * as FileSystem from 'expo-file-system';
import { unzip } from 'react-native-zip-archive';
import { powerSyncSystem } from '@/shared/services/powersync';
import { supabase } from '@/shared/services/api/supabase';
import type { PackageManifest } from '../types';
import { useVersionsStore } from '@/features/languages/store/versionsStore';
import { resolveTargetUserId } from '@/shared/services/auth/OfflineIdentity';
// no-op

export class ImportService {
  static async previewPackage(pkgUri: string): Promise<PackageManifest> {
    try {
      const tempDir = `${FileSystem.cacheDirectory}import-${Date.now()}/`;
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
      const unzipped = await unzip(pkgUri, tempDir);
      let dirOs = unzipped.endsWith('/') ? unzipped : `${unzipped}/`;
      let dirFs = dirOs.startsWith('file://') ? dirOs : `file://${dirOs}`;
      let manifestFs = `${dirFs}manifest.json`;
      let info = await FileSystem.getInfoAsync(manifestFs);
      if (!info.exists) {
        // Some zips include a top-level folder. Look one level down.
        const entries = await FileSystem.readDirectoryAsync(dirFs);
        for (const name of entries) {
          const childFs = `${dirFs}${name}/`;
          const stat = await FileSystem.getInfoAsync(childFs);
          if (stat.isDirectory) {
            const candidateFs = `${childFs}manifest.json`;
            const cinfo = await FileSystem.getInfoAsync(candidateFs);
            if (cinfo.exists) {
              dirFs = childFs;
              dirOs = dirFs.replace('file://', '');
              manifestFs = candidateFs;
              info = cinfo;
              break;
            }
          }
        }
      }
      const manifestStr = await FileSystem.readAsStringAsync(manifestFs);
      const manifest = JSON.parse(manifestStr) as PackageManifest;
      return manifest;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[ImportService] previewPackage failed', e);
      throw e;
    }
  }

  static async importPackage(pkgUri: string): Promise<void> {
    if (!powerSyncSystem.isInitialized) throw new Error('DB not ready');
    const tempDir = `${FileSystem.cacheDirectory}import-${Date.now()}/`;
    await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
    const unzippedRaw = await unzip(pkgUri, tempDir);
    let unzippedOs = unzippedRaw.endsWith('/')
      ? unzippedRaw
      : `${unzippedRaw}/`;
    let unzippedFs = unzippedOs.startsWith('file://')
      ? unzippedOs
      : `file://${unzippedOs}`;
    // Resolve package root (handle nested top-level folder)
    let manifestFs = `${unzippedFs}manifest.json`;
    let info = await FileSystem.getInfoAsync(manifestFs);
    if (!info.exists) {
      const entries = await FileSystem.readDirectoryAsync(unzippedFs);
      for (const name of entries) {
        const childFs = `${unzippedFs}${name}/`;
        const stat = await FileSystem.getInfoAsync(childFs);
        if (stat.isDirectory) {
          const candidateFs = `${childFs}manifest.json`;
          const cinfo = await FileSystem.getInfoAsync(candidateFs);
          if (cinfo.exists) {
            unzippedFs = childFs;
            unzippedOs = unzippedFs.replace('file://', '');
            manifestFs = candidateFs;
            info = cinfo;
            break;
          }
        }
      }
    }

    const manifestStr = await FileSystem.readAsStringAsync(manifestFs);
    const manifest = JSON.parse(manifestStr) as PackageManifest;

    // Resolve a target user id for writes (session uid if available, else device-scoped offline uid)
    let sessionUserId: string | null = null;
    try {
      const sessionRes = await supabase.auth.getSession();
      sessionUserId = sessionRes?.data?.session?.user?.id ?? null;
    } catch {
      // ignore
    }
    const targetUserId = await resolveTargetUserId(sessionUserId);

    // 1) Copy media files (recursive) to app storage and build map path->absolute
    const mediaDir = `${unzippedFs}${manifest.mediaRoot || 'media'}/`;
    const appMediaRoot = `${FileSystem.documentDirectory}media/`;
    const pathMap: Record<string, string> = {};
    await FileSystem.makeDirectoryAsync(appMediaRoot, { intermediates: true });
    await this.copyRecursive(mediaDir, appMediaRoot, pathMap);

    // 2) ATTACH and upsert rows from single package.db using the main PowerSync connection
    try {
      const dbPathFs = `${unzippedFs}${manifest.dbFilename}`;
      const dbAttach = dbPathFs.replace(/^file:\/\//, '');
      // Attach using literal SQL with single-quoted absolute path.
      const dbPathSql = dbAttach.replace(/'/g, "''");
      await powerSyncSystem.execute(`ATTACH DATABASE '${dbPathSql}' AS pkg`);
      await powerSyncSystem.execute('BEGIN');

      // Upsert synced rows (do not generate outbox by writing through PowerSync API; this writes directly to SQLite)

      // Audio version tables (if present)
      await powerSyncSystem.execute(
        `INSERT OR REPLACE INTO audio_versions SELECT * FROM pkg.audio_versions WHERE EXISTS (SELECT 1 FROM pkg.sqlite_master WHERE type='table' AND name='audio_versions')`
      );
      await powerSyncSystem.execute(
        `INSERT OR REPLACE INTO media_files SELECT * FROM pkg.media_files WHERE EXISTS (SELECT 1 FROM pkg.sqlite_master WHERE type='table' AND name='media_files')`
      );
      await powerSyncSystem.execute(
        `INSERT OR REPLACE INTO media_files_verses SELECT * FROM pkg.media_files_verses WHERE EXISTS (SELECT 1 FROM pkg.sqlite_master WHERE type='table' AND name='media_files_verses')`
      );

      // Text version tables (if present)
      await powerSyncSystem.execute(
        `INSERT OR REPLACE INTO text_versions SELECT * FROM pkg.text_versions WHERE EXISTS (SELECT 1 FROM pkg.sqlite_master WHERE type='table' AND name='text_versions')`
      );
      await powerSyncSystem.execute(
        `INSERT OR REPLACE INTO verse_texts SELECT * FROM pkg.verse_texts WHERE EXISTS (SELECT 1 FROM pkg.sqlite_master WHERE type='table' AND name='verse_texts')`
      );

      // Upsert local-only rows using bulk INSERT ... SELECT
      await powerSyncSystem.execute(
        `INSERT OR REPLACE INTO media_files_downloads SELECT * FROM pkg.media_files_downloads`
      );
      // Rewrite relative paths to absolute file paths using the copied media
      const entries = Object.entries(pathMap);
      for (const [rel, abs] of entries) {
        await powerSyncSystem.execute(
          `UPDATE media_files_downloads SET local_file_path = ? WHERE local_file_path = ?`,
          [abs, rel]
        );
      }

      await powerSyncSystem.execute(
        `INSERT OR REPLACE INTO user_saved_audio_versions_downloads SELECT * FROM pkg.user_saved_audio_versions_downloads WHERE EXISTS (SELECT 1 FROM pkg.sqlite_master WHERE type='table' AND name='user_saved_audio_versions_downloads')`
      );

      await powerSyncSystem.execute(
        `INSERT OR REPLACE INTO version_language_lookup SELECT * FROM pkg.version_language_lookup`
      );

      // Auto-select imported version: add to saved and set current for target user id
      if (manifest.kind === 'audio' && manifest.audioVersionId) {
        const now = new Date().toISOString();
        // Ensure a saved record exists for the target user
        await powerSyncSystem.execute(
          `INSERT OR IGNORE INTO user_saved_audio_versions (id, user_id, audio_version_id, created_at, updated_at)
           VALUES (COALESCE((SELECT id FROM user_saved_audio_versions WHERE user_id = ? AND audio_version_id = ? LIMIT 1), lower(hex(randomblob(16)))), ?, ?, ?, ?)`,
          [
            targetUserId,
            manifest.audioVersionId,
            targetUserId,
            manifest.audioVersionId,
            now,
            now,
          ]
        );
        // Set current audio selection for target user; preserve existing text selection
        await powerSyncSystem.execute(
          `INSERT OR REPLACE INTO user_current_selections (id, user_id, selected_audio_version, selected_text_version, created_at, updated_at)
           VALUES (
             COALESCE((SELECT id FROM user_current_selections WHERE user_id = ? LIMIT 1), lower(hex(randomblob(16)))),
             ?,
             ?,
             COALESCE((SELECT selected_text_version FROM user_current_selections WHERE user_id = ? LIMIT 1), (SELECT selected_text_version FROM user_current_selections LIMIT 1)),
             COALESCE((SELECT created_at FROM user_current_selections WHERE user_id = ? LIMIT 1), ?),
             ?
           )`,
          [
            targetUserId,
            targetUserId,
            manifest.audioVersionId,
            targetUserId,
            targetUserId,
            now,
            now,
          ]
        );
      }

      // Auto-select imported text version for target user id
      if (manifest.kind === 'text' && manifest.textVersionId) {
        const now = new Date().toISOString();
        // Ensure a saved record exists for the target user
        await powerSyncSystem.execute(
          `INSERT OR IGNORE INTO user_saved_text_versions (id, user_id, text_version_id, created_at, updated_at)
           VALUES (COALESCE((SELECT id FROM user_saved_text_versions WHERE user_id = ? AND text_version_id = ? LIMIT 1), lower(hex(randomblob(16)))), ?, ?, ?, ?)`,
          [
            targetUserId,
            manifest.textVersionId,
            targetUserId,
            manifest.textVersionId,
            now,
            now,
          ]
        );
        // Set current text selection for target user; preserve existing audio selection
        await powerSyncSystem.execute(
          `INSERT OR REPLACE INTO user_current_selections (id, user_id, selected_audio_version, selected_text_version, created_at, updated_at)
           VALUES (
             COALESCE((SELECT id FROM user_current_selections WHERE user_id = ? LIMIT 1), lower(hex(randomblob(16)))),
             ?,
             COALESCE((SELECT selected_audio_version FROM user_current_selections WHERE user_id = ? LIMIT 1), (SELECT selected_audio_version FROM user_current_selections LIMIT 1)),
             ?,
             COALESCE((SELECT created_at FROM user_current_selections WHERE user_id = ? LIMIT 1), ?),
             ?
           )`,
          [
            targetUserId,
            targetUserId,
            targetUserId,
            manifest.textVersionId,
            targetUserId,
            now,
            now,
          ]
        );
      }

      await powerSyncSystem.execute('COMMIT');
    } catch (e) {
      try {
        await powerSyncSystem.execute('ROLLBACK');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[ImportService] rollback failed', err);
      }
      throw e;
    } finally {
      try {
        await powerSyncSystem.execute('DETACH DATABASE pkg');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[ImportService] detach failed', err);
      }
      try {
        // Refresh versions store to reflect imported data and auto-selection
        await useVersionsStore.getState().refresh();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[ImportService] refresh store failed', err);
      }
    }
  }

  private static async copyRecursive(
    fromDir: string,
    toDir: string,
    pathMap: Record<string, string>,
    baseFrom?: string
  ): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(fromDir);
      if (!info.exists) return;
      const entries = await FileSystem.readDirectoryAsync(fromDir);
      for (const name of entries) {
        const src = `${fromDir}${name}`;
        const stat = await FileSystem.getInfoAsync(src);
        if (stat.isDirectory) {
          await FileSystem.makeDirectoryAsync(`${toDir}${name}/`, {
            intermediates: true,
          });
          await this.copyRecursive(
            `${src}/`,
            `${toDir}${name}/`,
            pathMap,
            baseFrom ?? fromDir
          );
        } else {
          const rel = src.replace(baseFrom ?? fromDir, '').replace(/^\//, '');
          const dest = `${toDir}${name}`;
          await FileSystem.copyAsync({ from: src, to: dest });
          pathMap[rel] = dest;
        }
      }
    } catch {
      // ignore
    }
  }
}
