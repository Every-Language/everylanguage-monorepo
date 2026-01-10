/* eslint-disable @typescript-eslint/no-explicit-any */
import * as FileSystem from 'expo-file-system';
import { zip } from 'react-native-zip-archive';
import { powerSyncSystem } from '@/shared/services/powersync';
import type { AudioPackageScope, PackageManifest } from '../types';
import { createBaseManifest } from './Manifest';
import { open } from '@op-engineering/op-sqlite';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

const TARGET_PART_BYTES = 500 * 1024 * 1024; // 500 MB

export class AudioPackagingService {
  static async createPackage(
    audioVersionId: string,
    scope: AudioPackageScope
  ): Promise<{ packageUris: string[]; manifests: PackageManifest[] }> {
    if (!powerSyncSystem.isInitialized) {
      throw new Error('Database not initialized');
    }

    const tmpRoot = `${FileSystem.cacheDirectory}pkg-${audioVersionId}-${Date.now()}/`;
    await FileSystem.makeDirectoryAsync(tmpRoot, { intermediates: true });

    const pkgDbPath = `${tmpRoot}package.db`;
    const mediaRoot = `${tmpRoot}media/`;
    await FileSystem.makeDirectoryAsync(mediaRoot, { intermediates: true });

    // Query rows for scope
    const mediaRows = (await powerSyncSystem.getAll(
      scope.mode === 'books'
        ? `SELECT mf.id, mf.object_key, mf.file_size, mfd.local_file_path, mfd.file_size_bytes, mf.chapter_id
           FROM media_files mf
           LEFT JOIN media_files_downloads mfd ON mfd.media_file_id = mf.id
           WHERE mf.audio_version_id = ?
             AND mf.chapter_id IN (
               SELECT c.id FROM chapters c WHERE c.book_id IN (${scope.bookIds
                 .map(() => '?')
                 .join(',')})
             )
             AND mf.object_key IS NOT NULL AND mf.object_key <> ''
             AND mf.deleted_at IS NULL
           ORDER BY mf.id`
        : `SELECT mf.id, mf.object_key, mf.file_size, mfd.local_file_path, mfd.file_size_bytes, mf.chapter_id
           FROM media_files mf
           LEFT JOIN media_files_downloads mfd ON mfd.media_file_id = mf.id
           WHERE mf.audio_version_id = ?
             AND mf.object_key IS NOT NULL AND mf.object_key <> ''
             AND mf.deleted_at IS NULL
           ORDER BY mf.id`,
      scope.mode === 'books'
        ? ([audioVersionId, ...scope.bookIds] as any[])
        : ([audioVersionId] as any[])
    )) as Array<{
      id: string;
      object_key: string | null;
      file_size: number | null;
      file_size_bytes: number | null;
      local_file_path: string | null;
      chapter_id: string;
    }>;

    // Fetch version row and language lookup (if present locally)
    await powerSyncSystem.getAll(
      'SELECT * FROM audio_versions WHERE id = ? LIMIT 1',
      [audioVersionId]
    );
    const langLookupRows = (await powerSyncSystem.getAll(
      `SELECT * FROM version_language_lookup WHERE version_type = 'audio' AND version_id = ?`,
      [audioVersionId]
    )) as Array<Record<string, unknown>>;

    // Partition files into parts ~500MB
    const files = this.buildFileList(mediaRows, audioVersionId);
    const parts = this.partitionFiles(files);

    const packageUris: string[] = [];
    const manifests: PackageManifest[] = [];

    // Build a single DB containing both syncable and local-only tables
    await this.buildPackageDb(
      pkgDbPath,
      audioVersionId,
      mediaRows,
      langLookupRows
    );

    // For each part, copy subset of media and zip
    for (let i = 0; i < parts.length; i++) {
      const partDir = `${tmpRoot}part-${i + 1}/`;
      await FileSystem.makeDirectoryAsync(partDir, { intermediates: true });

      // Copy single packaged DB
      await FileSystem.copyAsync({
        from: pkgDbPath,
        to: `${partDir}package.db`,
      });

      // Media subtree
      const partMediaRoot = `${partDir}media/`;
      await FileSystem.makeDirectoryAsync(partMediaRoot, {
        intermediates: true,
      });

      await this.copyMediaFiles(parts[i]!, partMediaRoot);

      const manifest = createBaseManifest();
      manifest.kind = 'audio';
      manifest.audioVersionId = audioVersionId;
      manifest.scope = scope;
      manifest.dbFilename = 'package.db';

      await FileSystem.writeAsStringAsync(
        `${partDir}manifest.json`,
        JSON.stringify(manifest)
      );

      const outZip = `${FileSystem.documentDirectory}el-${audioVersionId}-part${i + 1}.elpkg`;
      await zip(partDir, outZip);
      packageUris.push(outZip);
      manifests.push(manifest);
    }

    return { packageUris, manifests };
  }

  private static buildFileList(
    mediaRows: Array<{
      id: string;
      object_key: string | null;
      file_size: number | null;
      file_size_bytes: number | null;
      local_file_path: string | null;
      chapter_id: string;
    }>,
    audioVersionId: string
  ) {
    type FileItem = {
      id: string;
      size: number;
      local: string | null;
      relPath: string;
    };

    const files: FileItem[] = [];
    for (const r of mediaRows) {
      const size = Number(r.file_size_bytes ?? r.file_size ?? 0);
      const ext = this.getFileExtension(r.object_key);
      const relPath = `${audioVersionId}/${r.chapter_id}/${r.id}${ext}`;
      files.push({ id: r.id, size, local: r.local_file_path || null, relPath });
    }
    return files;
  }

  private static getFileExtension(objectKey: string | null): string {
    const fromObjectKey = (objectKey || '').split('.').pop();
    const cleaned = (fromObjectKey || '').toLowerCase();
    // Basic guard to avoid absurd lengths
    if (cleaned && cleaned.length > 0 && cleaned.length <= 5) {
      return `.${cleaned}`;
    }
    return '.mp3';
  }

  private static partitionFiles(
    files: Array<{
      id: string;
      size: number;
      local: string | null;
      relPath: string;
    }>
  ) {
    const parts: (typeof files)[] = [];
    let current: typeof files = [];
    let currentSize = 0;

    for (const f of files) {
      if (currentSize + f.size > TARGET_PART_BYTES && current.length > 0) {
        parts.push(current);
        current = [];
        currentSize = 0;
      }
      current.push(f);
      currentSize += f.size;
    }
    if (current.length) parts.push(current);

    return parts;
  }

  private static async copyMediaFiles(
    files: Array<{
      id: string;
      size: number;
      local: string | null;
      relPath: string;
    }>,
    partMediaRoot: string
  ) {
    for (const f of files) {
      const relDir = f.relPath.substring(0, f.relPath.lastIndexOf('/'));
      const destDir = `${partMediaRoot}${relDir}/`;
      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
      if (f.local) {
        const dest = `${partMediaRoot}${f.relPath}`;
        const from = await this.resolveAbsoluteUri(f.local);
        await FileSystem.copyAsync({ from, to: dest });
      }
    }
  }

  private static async buildPackageDb(
    outPath: string,
    audioVersionId: string,
    mediaRows: Array<{
      id: string;
      object_key: string | null;
      file_size: number | null;
      file_size_bytes: number | null;
      local_file_path: string | null;
      chapter_id: string;
    }>,
    langLookupRows: Array<Record<string, unknown>>
  ): Promise<void> {
    const dbName = `pkg-all-${Date.now()}.sqlite`;
    const basePath = (FileSystem.cacheDirectory || '').replace('file://', '');
    const db = open({ name: dbName, location: basePath });

    try {
      await db.execute('PRAGMA foreign_keys = OFF');

      // Create tables (syncable)
      await this.createAudioTables(db);

      // Create tables (local-only)
      await this.createLocalTables(db);

      // Insert data
      await this.insertAudioVersionData(db, audioVersionId);
      await this.insertMediaFilesData(db, audioVersionId, mediaRows);
      await this.insertMediaFilesVersesData(db, audioVersionId);
      await this.insertLocalData(db, audioVersionId, mediaRows, langLookupRows);

      // Copy DB file to outPath
      await this.copyDatabase(db, outPath);
    } finally {
      try {
        db.close();
      } catch {
        // ignore close error
      }
    }
  }

  private static async createAudioTables(db: any) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS audio_versions (
        id TEXT PRIMARY KEY,
        language_entity_id TEXT,
        bible_version_id TEXT,
        project_id TEXT,
        name TEXT,
        created_at TEXT,
        created_by TEXT,
        updated_at TEXT,
        deleted_at TEXT
      )`
    );

    await db.execute(
      `CREATE TABLE IF NOT EXISTS media_files (
        id TEXT PRIMARY KEY,
        language_entity_id TEXT,
        media_type TEXT,
        file_size INTEGER,
        duration_seconds REAL,
        upload_status TEXT,
        publish_status TEXT,
        check_status TEXT,
        version INTEGER,
        created_at TEXT,
        created_by TEXT,
        updated_at TEXT,
        deleted_at TEXT,
        is_bible_audio INTEGER,
        start_verse_id TEXT,
        end_verse_id TEXT,
        audio_version_id TEXT,
        chapter_id TEXT,
        object_key TEXT,
        storage_provider TEXT
      )`
    );

    await db.execute(
      `CREATE TABLE IF NOT EXISTS media_files_verses (
        id TEXT PRIMARY KEY,
        media_file_id TEXT,
        verse_id TEXT,
        start_time_seconds REAL,
        duration_seconds REAL,
        created_by TEXT,
        created_at TEXT,
        updated_at TEXT,
        deleted_at TEXT,
        denormalized_audio_version_id TEXT
      )`
    );
  }

  private static async createLocalTables(db: any) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS media_files_downloads (
        id TEXT PRIMARY KEY,
        media_file_id TEXT,
        local_file_path TEXT,
        download_status TEXT,
        progress REAL,
        downloaded_bytes INTEGER,
        file_size_bytes INTEGER,
        error_message TEXT,
        priority INTEGER,
        retry_count INTEGER,
        last_attempt_at TEXT,
        downloaded_at TEXT,
        created_at TEXT,
        updated_at TEXT
      )`
    );

    await db.execute(
      `CREATE TABLE IF NOT EXISTS user_saved_audio_versions_downloads (
        id TEXT PRIMARY KEY,
        audio_version_id TEXT,
        created_at TEXT
      )`
    );

    await db.execute(
      `CREATE TABLE IF NOT EXISTS version_language_lookup (
        id TEXT PRIMARY KEY,
        version_type TEXT,
        version_id TEXT,
        language_entity_id TEXT,
        language_entity_name TEXT,
        language_alias_name TEXT,
        region_name TEXT,
        created_at TEXT,
        updated_at TEXT
      )`
    );
  }

  private static async insertAudioVersionData(db: any, audioVersionId: string) {
    const versionRow = (await powerSyncSystem.getAll(
      'SELECT * FROM audio_versions WHERE id = ? LIMIT 1',
      [audioVersionId]
    )) as Array<Record<string, unknown>>;

    if (versionRow.length > 0) {
      const v = versionRow[0]!;
      await db.execute(
        `INSERT OR REPLACE INTO audio_versions (
          id, language_entity_id, bible_version_id, project_id, name,
          created_at, created_by, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(v['id'] ?? ''),
          v['language_entity_id'] == null
            ? null
            : String(v['language_entity_id']),
          v['bible_version_id'] == null ? null : String(v['bible_version_id']),
          v['project_id'] == null ? null : String(v['project_id']),
          v['name'] == null ? null : String(v['name']),
          v['created_at'] == null ? null : String(v['created_at']),
          v['created_by'] == null ? null : String(v['created_by']),
          v['updated_at'] == null ? null : String(v['updated_at']),
          v['deleted_at'] == null ? null : String(v['deleted_at']),
        ]
      );
    }
  }

  private static async insertMediaFilesData(
    db: any,
    _audioVersionId: string,
    mediaRows: Array<{ id: string }>
  ) {
    const ids = mediaRows.map(r => r.id);
    if (ids.length > 0) {
      const rows = (await powerSyncSystem.getAll(
        `SELECT * FROM media_files WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      )) as Array<Record<string, unknown>>;

      for (const r of rows) {
        await db.execute(
          `INSERT OR REPLACE INTO media_files (
            id, language_entity_id, media_type, file_size, duration_seconds, upload_status, publish_status, check_status,
            version, created_at, created_by, updated_at, deleted_at, is_bible_audio, start_verse_id, end_verse_id,
            audio_version_id, chapter_id, object_key, storage_provider
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r['id'] == null ? null : String(r['id']),
            r['language_entity_id'] == null
              ? null
              : String(r['language_entity_id']),
            r['media_type'] == null ? null : String(r['media_type']),
            r['file_size'] == null ? null : Number(r['file_size']),
            r['duration_seconds'] == null
              ? null
              : Number(r['duration_seconds']),
            r['upload_status'] == null ? null : String(r['upload_status']),
            r['publish_status'] == null ? null : String(r['publish_status']),
            r['check_status'] == null ? null : String(r['check_status']),
            r['version'] == null ? null : Number(r['version']),
            r['created_at'] == null ? null : String(r['created_at']),
            r['created_by'] == null ? null : String(r['created_by']),
            r['updated_at'] == null ? null : String(r['updated_at']),
            r['deleted_at'] == null ? null : String(r['deleted_at']),
            r['is_bible_audio'] == null ? null : Number(r['is_bible_audio']),
            r['start_verse_id'] == null ? null : String(r['start_verse_id']),
            r['end_verse_id'] == null ? null : String(r['end_verse_id']),
            r['audio_version_id'] == null
              ? null
              : String(r['audio_version_id']),
            r['chapter_id'] == null ? null : String(r['chapter_id']),
            r['object_key'] == null ? null : String(r['object_key']),
            r['storage_provider'] == null
              ? null
              : String(r['storage_provider']),
          ]
        );
      }
    }
  }

  private static async insertMediaFilesVersesData(
    db: any,
    audioVersionId: string
  ) {
    const mvv = (await powerSyncSystem.getAll(
      'SELECT * FROM media_files_verses WHERE denormalized_audio_version_id = ?',
      [audioVersionId]
    )) as Array<Record<string, unknown>>;

    for (const r of mvv) {
      await db.execute(
        `INSERT OR REPLACE INTO media_files_verses (
          id, media_file_id, verse_id, start_time_seconds, duration_seconds, created_by, created_at, updated_at, deleted_at, denormalized_audio_version_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r['id'] == null ? null : String(r['id']),
          r['media_file_id'] == null ? null : String(r['media_file_id']),
          r['verse_id'] == null ? null : String(r['verse_id']),
          r['start_time_seconds'] == null
            ? null
            : Number(r['start_time_seconds']),
          r['duration_seconds'] == null ? null : Number(r['duration_seconds']),
          r['created_by'] == null ? null : String(r['created_by']),
          r['created_at'] == null ? null : String(r['created_at']),
          r['updated_at'] == null ? null : String(r['updated_at']),
          r['deleted_at'] == null ? null : String(r['deleted_at']),
          r['denormalized_audio_version_id'] == null
            ? null
            : String(r['denormalized_audio_version_id']),
        ]
      );
    }
  }

  private static async insertLocalData(
    db: any,
    audioVersionId: string,
    mediaRows: Array<{
      id: string;
      object_key: string | null;
      file_size: number | null;
      file_size_bytes: number | null;
      local_file_path: string | null;
      chapter_id: string;
    }>,
    langLookupRows: Array<Record<string, unknown>>
  ) {
    const ts = new Date().toISOString();
    let downloadsInserted = 0;

    for (const r of mediaRows) {
      if (!r.local_file_path) continue;
      const size = Number(r.file_size_bytes ?? r.file_size ?? 0) || null;
      const ext = this.getFileExtension(r.object_key);
      const relPath = `${audioVersionId}/${r.chapter_id}/${r.id}${ext}`;

      await db.execute(
        `INSERT OR REPLACE INTO media_files_downloads (
          id, media_file_id, local_file_path, download_status, progress,
          downloaded_bytes, file_size_bytes, error_message, priority, retry_count,
          last_attempt_at, downloaded_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'completed', 1.0, ?, ?, NULL, 0, 0, ?, ?, ?, ?)`,
        [r.id, r.id, relPath, size, size, ts, ts, ts, ts]
      );
      downloadsInserted += 1;
    }

    logger.info(
      ENABLE_LOGGING,
      '[AudioPackagingService] packaged media_files_downloads rows:',
      downloadsInserted
    );

    await db.execute(
      `INSERT OR REPLACE INTO user_saved_audio_versions_downloads (id, audio_version_id, created_at)
       VALUES (?, ?, ?)`,
      [audioVersionId, audioVersionId, ts]
    );

    for (const r of langLookupRows) {
      const id =
        String((r['version_type'] as string | undefined) ?? 'audio') +
        ':' +
        String((r['version_id'] as string | undefined) ?? audioVersionId);
      await db.execute(
        `INSERT OR REPLACE INTO version_language_lookup (
          id, version_type, version_id, language_entity_id, language_entity_name, language_alias_name, region_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          (r['version_type'] as string | undefined) ?? 'audio',
          (r['version_id'] as string | undefined) ?? audioVersionId,
          r['language_entity_id'] == null
            ? null
            : String(r['language_entity_id']),
          r['language_entity_name'] == null
            ? null
            : String(r['language_entity_name']),
          r['language_alias_name'] == null
            ? null
            : String(r['language_alias_name']),
          r['region_name'] == null ? null : String(r['region_name']),
          String((r['created_at'] as string | undefined) ?? ts),
          String((r['updated_at'] as string | undefined) ?? ts),
        ]
      );
    }

    logger.info(
      ENABLE_LOGGING,
      '[AudioPackagingService] packaged version_language_lookup rows:',
      langLookupRows.length
    );
  }

  private static async copyDatabase(db: any, outPath: string) {
    const dbPath = db.getDbPath();
    const fromUri = dbPath.startsWith('file://') ? dbPath : `file://${dbPath}`;
    const info = await FileSystem.getInfoAsync(fromUri);
    if (!info.exists) {
      throw new Error(`Packaged DB path not found: ${fromUri}`);
    }
    await FileSystem.copyAsync({ from: fromUri, to: outPath });
  }

  private static async resolveAbsoluteUri(pathOrUri: string): Promise<string> {
    if (pathOrUri.startsWith('file://')) return pathOrUri;

    const cleaned = pathOrUri.replace(/^\/+/, '');

    const docBase = FileSystem.documentDirectory || '';
    if (docBase) {
      const candidate = `${docBase}${cleaned}`;
      const info = await FileSystem.getInfoAsync(candidate);
      if (info.exists) return candidate;
    }

    const cacheBase = FileSystem.cacheDirectory || '';
    if (cacheBase) {
      const candidate = `${cacheBase}${cleaned}`;
      const info = await FileSystem.getInfoAsync(candidate);
      if (info.exists) return candidate;
    }

    // Fallback to documentDirectory even if not confirmed; copyAsync will error if truly missing
    return `${docBase}${cleaned}`;
  }
}
