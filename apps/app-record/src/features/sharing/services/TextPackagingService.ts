/* eslint-disable @typescript-eslint/no-explicit-any */
import * as FileSystem from 'expo-file-system';
import { zip } from 'react-native-zip-archive';
import { powerSyncSystem } from '@/shared/services/powersync';
import type { TextPackageScope, PackageManifest } from '../types';
import { createBaseManifest } from './Manifest';
import { open } from '@op-engineering/op-sqlite';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

const TARGET_PART_BYTES = 500 * 1024 * 1024; // 500 MB

export class TextPackagingService {
  static async createPackage(
    textVersionId: string,
    scope: TextPackageScope
  ): Promise<{ packageUris: string[]; manifests: PackageManifest[] }> {
    if (!powerSyncSystem.isInitialized) {
      throw new Error('Database not initialized');
    }

    const tmpRoot = `${FileSystem.cacheDirectory}pkg-text-${textVersionId}-${Date.now()}/`;
    await FileSystem.makeDirectoryAsync(tmpRoot, { intermediates: true });

    // Query verse texts for scope
    const verseTextRows = await this.queryVerseTexts(textVersionId, scope);

    // Fetch language lookup for text version
    const langLookupRows = (await powerSyncSystem.getAll(
      `SELECT * FROM version_language_lookup WHERE version_type = 'text' AND version_id = ?`,
      [textVersionId]
    )) as Array<Record<string, unknown>>;

    // Partition text content if needed (usually won't be needed)
    const parts = this.partitionVerseTexts(verseTextRows);

    const packageUris: string[] = [];
    const manifests: PackageManifest[] = [];

    // Build database for each part
    for (let i = 0; i < parts.length; i++) {
      const partDir = `${tmpRoot}part-${i + 1}/`;
      await FileSystem.makeDirectoryAsync(partDir, { intermediates: true });

      const partDbPath = `${partDir}package.db`;
      await this.buildPackageDb(
        partDbPath,
        textVersionId,
        parts[i]!,
        langLookupRows
      );

      const manifest = createBaseManifest();
      manifest.kind = 'text';
      manifest.textVersionId = textVersionId;
      manifest.scope = scope;
      manifest.dbFilename = 'package.db';
      // No mediaRoot needed for text packages
      delete manifest.mediaRoot;

      await FileSystem.writeAsStringAsync(
        `${partDir}manifest.json`,
        JSON.stringify(manifest)
      );

      const outZip = `${FileSystem.documentDirectory}el-text-${textVersionId}-part${i + 1}.elpkg`;
      await zip(partDir, outZip);
      packageUris.push(outZip);
      manifests.push(manifest);
    }

    return { packageUris, manifests };
  }

  private static async queryVerseTexts(
    textVersionId: string,
    scope: TextPackageScope
  ) {
    return (await powerSyncSystem.getAll(
      scope.mode === 'books'
        ? `SELECT vt.* FROM verse_texts vt
           INNER JOIN verses v ON v.id = vt.verse_id
           INNER JOIN chapters c ON c.id = v.chapter_id
           INNER JOIN books b ON b.id = c.book_id
           WHERE vt.text_version_id = ?
             AND b.id IN (${scope.bookIds.map(() => '?').join(',')})
             AND vt.deleted_at IS NULL
           ORDER BY v.global_order`
        : `SELECT vt.* FROM verse_texts vt
           INNER JOIN verses v ON v.id = vt.verse_id
           WHERE vt.text_version_id = ?
             AND vt.deleted_at IS NULL
           ORDER BY v.global_order`,
      scope.mode === 'books'
        ? ([textVersionId, ...scope.bookIds] as any[])
        : ([textVersionId] as any[])
    )) as Array<{
      id: string;
      verse_id: string;
      text_version_id: string;
      verse_text: string;
      created_at: string;
      created_by: string;
      updated_at: string;
      deleted_at: string | null;
      version: number;
      publish_status: string;
    }>;
  }

  private static partitionVerseTexts(
    verseTextRows: Array<{
      id: string;
      verse_id: string;
      text_version_id: string;
      verse_text: string;
      created_at: string;
      created_by: string;
      updated_at: string;
      deleted_at: string | null;
      version: number;
      publish_status: string;
    }>
  ) {
    // For text packages, size estimation is based on text content
    // Estimate ~2 bytes per character for UTF-8
    const estimatedTextBytes = verseTextRows.reduce((total, row) => {
      return total + (row.verse_text?.length || 0) * 2;
    }, 0);

    // Text packages are usually small, but we'll still support splitting if needed
    const willSplit = estimatedTextBytes > TARGET_PART_BYTES;
    const parts: (typeof verseTextRows)[] = [];

    if (willSplit) {
      // Split verse texts into parts
      let current: typeof verseTextRows = [];
      let currentSize = 0;

      for (const row of verseTextRows) {
        const rowSize = (row.verse_text?.length || 0) * 2;
        if (currentSize + rowSize > TARGET_PART_BYTES && current.length > 0) {
          parts.push(current);
          current = [];
          currentSize = 0;
        }
        current.push(row);
        currentSize += rowSize;
      }
      if (current.length) parts.push(current);
    } else {
      parts.push(verseTextRows);
    }

    return parts;
  }

  private static async buildPackageDb(
    outPath: string,
    textVersionId: string,
    verseTextRows: Array<{
      id: string;
      verse_id: string;
      text_version_id: string;
      verse_text: string;
      created_at: string;
      created_by: string;
      updated_at: string;
      deleted_at: string | null;
      version: number;
      publish_status: string;
    }>,
    langLookupRows: Array<Record<string, unknown>>
  ): Promise<void> {
    const dbName = `pkg-text-${Date.now()}.sqlite`;
    const basePath = (FileSystem.cacheDirectory || '').replace('file://', '');
    const db = open({ name: dbName, location: basePath });

    try {
      await db.execute('PRAGMA foreign_keys = OFF');

      // Create tables
      await this.createTextTables(db);
      await this.createLocalTables(db);

      // Insert data
      await this.insertTextVersionData(db, textVersionId);
      await this.insertVerseTextsData(db, verseTextRows);
      await this.insertLocalData(db, textVersionId, langLookupRows);

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

  private static async createTextTables(db: any) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS text_versions (
        id TEXT PRIMARY KEY,
        language_entity_id TEXT,
        bible_version_id TEXT,
        name TEXT,
        text_version_source TEXT,
        created_at TEXT,
        created_by TEXT,
        updated_at TEXT,
        deleted_at TEXT,
        project_id TEXT
      )`
    );

    await db.execute(
      `CREATE TABLE IF NOT EXISTS verse_texts (
        id TEXT PRIMARY KEY,
        verse_id TEXT,
        text_version_id TEXT,
        verse_text TEXT,
        created_at TEXT,
        created_by TEXT,
        updated_at TEXT,
        deleted_at TEXT,
        version INTEGER,
        publish_status TEXT
      )`
    );
  }

  private static async createLocalTables(db: any) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS user_saved_text_versions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        text_version_id TEXT,
        created_at TEXT,
        updated_at TEXT
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

  private static async insertTextVersionData(db: any, textVersionId: string) {
    const versionRow = (await powerSyncSystem.getAll(
      'SELECT * FROM text_versions WHERE id = ? LIMIT 1',
      [textVersionId]
    )) as Array<Record<string, unknown>>;

    if (versionRow.length > 0) {
      const v = versionRow[0]!;
      await db.execute(
        `INSERT OR REPLACE INTO text_versions (
          id, language_entity_id, bible_version_id, name, text_version_source,
          created_at, created_by, updated_at, deleted_at, project_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(v['id'] ?? ''),
          v['language_entity_id'] == null
            ? null
            : String(v['language_entity_id']),
          v['bible_version_id'] == null ? null : String(v['bible_version_id']),
          v['name'] == null ? null : String(v['name']),
          v['text_version_source'] == null
            ? null
            : String(v['text_version_source']),
          v['created_at'] == null ? null : String(v['created_at']),
          v['created_by'] == null ? null : String(v['created_by']),
          v['updated_at'] == null ? null : String(v['updated_at']),
          v['deleted_at'] == null ? null : String(v['deleted_at']),
          v['project_id'] == null ? null : String(v['project_id']),
        ]
      );
    }
  }

  private static async insertVerseTextsData(
    db: any,
    verseTextRows: Array<{
      id: string;
      verse_id: string;
      text_version_id: string;
      verse_text: string;
      created_at: string;
      created_by: string;
      updated_at: string;
      deleted_at: string | null;
      version: number;
      publish_status: string;
    }>
  ) {
    for (const row of verseTextRows) {
      await db.execute(
        `INSERT OR REPLACE INTO verse_texts (
          id, verse_id, text_version_id, verse_text, created_at, created_by,
          updated_at, deleted_at, version, publish_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.verse_id,
          row.text_version_id,
          row.verse_text,
          row.created_at,
          row.created_by,
          row.updated_at,
          row.deleted_at,
          row.version,
          row.publish_status,
        ]
      );
    }

    logger.info(
      ENABLE_LOGGING,
      '[TextPackagingService] packaged verse_texts rows:',
      verseTextRows.length
    );
  }

  private static async insertLocalData(
    db: any,
    textVersionId: string,
    langLookupRows: Array<Record<string, unknown>>
  ) {
    const ts = new Date().toISOString();

    // Insert saved text version record
    await db.execute(
      `INSERT OR REPLACE INTO user_saved_text_versions (id, user_id, text_version_id, created_at, updated_at)
       VALUES (?, 'imported-user', ?, ?, ?)`,
      [textVersionId, textVersionId, ts, ts]
    );

    // Insert language lookup rows
    for (const r of langLookupRows) {
      const id =
        String((r['version_type'] as string | undefined) ?? 'text') +
        ':' +
        String((r['version_id'] as string | undefined) ?? textVersionId);
      await db.execute(
        `INSERT OR REPLACE INTO version_language_lookup (
          id, version_type, version_id, language_entity_id, language_entity_name,
          language_alias_name, region_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          (r['version_type'] as string | undefined) ?? 'text',
          (r['version_id'] as string | undefined) ?? textVersionId,
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
      '[TextPackagingService] packaged version_language_lookup rows:',
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
}
