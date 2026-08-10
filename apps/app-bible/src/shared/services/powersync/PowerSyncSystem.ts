/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  PowerSyncDatabase,
  SyncStreamConnectionMethod,
} from '@powersync/react-native';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { AppSchema } from '../../../../powersync/AppSchema';
import { PowerSyncConnector } from './PowerSyncConnector';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

/**
 * PowerSync Database System
 *
 * Manages the PowerSync database instance and connection lifecycle.
 * Uses OP-SQLite for better encryption support and New Architecture compatibility.
 */
class PowerSyncSystem {
  private static instance: PowerSyncSystem;
  private _powersync: PowerSyncDatabase | null = null;
  private _connector: PowerSyncConnector | null = null;
  private _isInitialized = false;
  private _connectionMethod: SyncStreamConnectionMethod =
    SyncStreamConnectionMethod.WEB_SOCKET;
  private _dbReadyResolvers: Array<() => void> = [];
  private _seedPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): PowerSyncSystem {
    if (!PowerSyncSystem.instance) {
      PowerSyncSystem.instance = new PowerSyncSystem();
    }
    return PowerSyncSystem.instance;
  }

  /**
   * Initialize the PowerSync database
   */
  public async initialize(): Promise<void> {
    if (this._isInitialized && this._powersync) {
      return;
    }

    try {
      const opSqliteFactory = new OPSqliteOpenFactory({
        dbFilename: 'powersync-everylanguage.db',
      });

      // Create PowerSync database instance
      this._powersync = new PowerSyncDatabase({
        schema: AppSchema,
        database: opSqliteFactory,
      });

      // Initialize the database
      await this._powersync.init();

      // Fire-and-forget seeding to avoid blocking app init
      this._seedPromise = this.seedBibleStructureIfNeededInBackground();

      this._isInitialized = true;
      // Resolve any waiters
      if (this._dbReadyResolvers.length > 0) {
        const resolvers = [...this._dbReadyResolvers];
        this._dbReadyResolvers.length = 0;
        resolvers.forEach(r => {
          try {
            r();
          } catch {
            // ignore
          }
        });
      }
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'PowerSync: Failed to initialize database:',
        error
      );
      throw error;
    }
  }
  /**
   * Await seeding completion if in progress. No-op if seeding not started or already finished.
   */
  public async waitUntilSeeded(): Promise<void> {
    if (this._seedPromise) {
      try {
        await this._seedPromise;
      } catch {
        // best-effort only
      }
    }
  }

  /**
   * Await seeding completion with a timeout. Resolves when seed completes or after timeoutMs.
   * Use before navigating to main app so Bible structure (books/chapters) is ready.
   */
  public async waitUntilSeededWithTimeout(timeoutMs: number): Promise<void> {
    if (!this._seedPromise) return;
    try {
      await Promise.race([
        this._seedPromise,
        new Promise<void>(resolve => setTimeout(() => resolve(), timeoutMs)),
      ]);
    } catch {
      // best-effort only
    }
  }

  /**
   * Set the connection method (HTTP or WebSocket)
   */
  public setConnectionMethod(method: SyncStreamConnectionMethod): void {
    this._connectionMethod = method;
  }

  /**
   * Get the current connection method
   */
  public getConnectionMethod(): string {
    return this._connectionMethod === SyncStreamConnectionMethod.HTTP
      ? 'HTTP Streaming'
      : 'WebSocket';
  }

  /**
   * Connect to PowerSync backend with automatic fallback
   * Tries WebSocket first, falls back to HTTP streaming on failure
   */
  public async connect(): Promise<void> {
    if (!this._powersync) {
      throw new Error(
        'PowerSync database not initialized. Call initialize() first.'
      );
    }

    // Wait for seed to complete to avoid nested transaction conflicts with uploader
    if (this._seedPromise) {
      try {
        await this._seedPromise;
      } catch {
        // non-fatal; continue connecting
      }
    }

    if (!this._connector) {
      // logger.info(ENABLE_LOGGING, 'PowerSync: Creating backend connector...');
      this._connector = new PowerSyncConnector();
    }

    // First try WebSocket (default)
    try {
      this._connectionMethod = SyncStreamConnectionMethod.WEB_SOCKET;
      // logger.info(ENABLE_LOGGING, 'PowerSync: Attempting WebSocket connection...');

      await this._powersync.connect(this._connector, {
        connectionMethod: this._connectionMethod,
      });

      // logger.info(ENABLE_LOGGING, 'PowerSync: Connected successfully via WebSocket');
      return;
    } catch (webSocketError) {
      logger.warn(
        ENABLE_LOGGING,
        'PowerSync: WebSocket connection failed, trying HTTP streaming fallback:',
        webSocketError
      );

      // Disconnect if partially connected
      try {
        await this._powersync.disconnect();
      } catch {
        // Ignore disconnect errors during fallback
      }

      // Wait a moment before retry
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try HTTP streaming fallback
      try {
        this._connectionMethod = SyncStreamConnectionMethod.HTTP;

        await this._powersync.connect(this._connector, {
          connectionMethod: this._connectionMethod,
        });

        return;
      } catch (httpError) {
        logger.error(
          ENABLE_LOGGING,
          'PowerSync: Both WebSocket and HTTP streaming failed:',
          httpError
        );
        throw new Error(
          `PowerSync connection failed: WebSocket (${webSocketError}), HTTP (${httpError})`
        );
      }
    }
  }

  /**
   * Disconnect from PowerSync backend
   */
  public async disconnect(): Promise<void> {
    if (this._powersync) {
      logger.info(ENABLE_LOGGING, 'PowerSync: Disconnecting from backend...');
      await this._powersync.disconnect();
      logger.info(ENABLE_LOGGING, 'PowerSync: Disconnected successfully');
    }
  }

  /**
   * Get the PowerSync database instance
   */
  public get database(): PowerSyncDatabase {
    if (!this._powersync) {
      throw new Error(
        'PowerSync database not initialized. Call initialize() first.'
      );
    }
    return this._powersync;
  }

  /**
   * Check if PowerSync is initialized
   */
  public get isInitialized(): boolean {
    return this._isInitialized && this._powersync !== null;
  }

  /**
   * Await database readiness (resolves as soon as initialize() completes)
   */
  public async waitUntilInitialized(): Promise<void> {
    if (this.isInitialized) return;
    await new Promise<void>(resolve => {
      this._dbReadyResolvers.push(resolve);
    });
  }

  /**
   * Check if PowerSync is connected
   */
  public get isConnected(): boolean {
    return this._powersync?.connected ?? false;
  }

  /**
   * Get connection status
   */
  public getStatus() {
    return {
      initialized: this.isInitialized,
      connected: this.isConnected,
      connectionMethod: this.getConnectionMethod(),
      status: this._powersync?.currentStatus ?? null,
    };
  }

  /**
   * Seed bible structure using a prebuilt SQLite database (assets/seed/bible-seed.db).
   * Fast attach-and-copy, computes global_order, and uses a robust seeded flag.
   */
  private async seedBibleStructureIfNeeded(): Promise<void> {
    if (!this._powersync) return;

    // Ensure meta table exists and check seeded flag using EXISTS (always returns a row)
    await this._powersync.execute(
      'CREATE TABLE IF NOT EXISTS __meta (__key TEXT PRIMARY KEY, __value TEXT)'
    );
    const seededCheck = (await this._powersync.get(
      'SELECT EXISTS(SELECT 1 FROM __meta WHERE __key = ?) AS seeded',
      ['bible_seed_v1']
    )) as { seeded?: number } | undefined;
    const alreadySeeded = Number(seededCheck?.seeded ?? 0) === 1;

    // Optional: also check counts to avoid work if structure is already present
    const row = (await this._powersync.get(
      `SELECT 
         (SELECT COUNT(1) FROM books) AS b,
         (SELECT COUNT(1) FROM chapters) AS c,
         (SELECT COUNT(1) FROM verses) AS v`
    )) as { b?: number; c?: number; v?: number } | undefined;
    const booksCount = Number(row?.b ?? 0);
    const chapCount = Number(row?.c ?? 0);
    const verseCount = Number(row?.v ?? 0);

    const MIN_BOOKS = 66;
    const MIN_CHAPTERS = 1189;
    const MIN_VERSES = 31102;

    if (
      alreadySeeded ||
      (booksCount >= MIN_BOOKS &&
        chapCount >= MIN_CHAPTERS &&
        verseCount >= MIN_VERSES)
    ) {
      logger.info(
        ENABLE_LOGGING,
        'PowerSync: Bible structure already present, skipping seed'
      );
      return;
    }

    const seedStart = Date.now();
    logger.info(
      ENABLE_LOGGING,
      'PowerSync: Seeding bible structure via attached seed DB...'
    );

    // Lazily import to keep initial bundle small
    const FileSystem = (await import('expo-file-system')) as any;
    const { Asset } = (await import('expo-asset')) as any;

    // Ensure the seed DB asset is available locally
    const asset = Asset.fromModule(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../../../assets/seed/bible-seed.db')
    );
    if (!asset.downloaded) {
      await asset.downloadAsync();
    }
    // Prefer attaching the asset directly; fallback to copying to documentDirectory
    const attachCandidates: string[] = [];
    if (asset.localUri && typeof asset.localUri === 'string') {
      attachCandidates.push(
        asset.localUri.replace(/^file:\/\//, '').replace(/'/g, "''")
      );
    }
    const destPath: string = `${FileSystem.documentDirectory}bible-seed.db`;
    attachCandidates.push(
      destPath.replace(/^file:\/\//, '').replace(/'/g, "''")
    );

    await this._powersync.execute('BEGIN');
    // Apply bulk-load PRAGMAs for faster insert within transaction scope
    try {
      await this._powersync.execute('PRAGMA foreign_keys = OFF');
    } catch (e) {
      void e;
    }
    try {
      await this._powersync.execute('PRAGMA synchronous = OFF');
    } catch (e) {
      void e;
    }
    try {
      await this._powersync.execute('PRAGMA temp_store = MEMORY');
    } catch (e) {
      void e;
    }

    let attached = false;
    let attachedFrom: 'asset' | 'copy' | null = null;
    try {
      let attachError: unknown | null = null;
      for (let i = 0; i < attachCandidates.length; i += 1) {
        const candidate = attachCandidates[i];
        try {
          await this._powersync.execute(
            `ATTACH DATABASE '${candidate}' AS seed`
          );
          attached = true;
          attachedFrom = i === 0 ? 'asset' : 'copy';
          break;
        } catch (e) {
          attachError = e;
          // If first attach (asset) fails, try copying then attach
          if (i === 0) {
            try {
              const info = await FileSystem.getInfoAsync(destPath);
              if (!info.exists) {
                await FileSystem.copyAsync({
                  from: asset.localUri,
                  to: destPath,
                });
              }
            } catch {
              await FileSystem.copyAsync({
                from: asset.localUri,
                to: destPath,
              });
            }
          }
        }
      }
      if (!attached && attachError) throw attachError;

      // Bulk copy core structure tables (explicit column lists)
      await this._powersync.execute(
        `INSERT OR IGNORE INTO bible_versions (id, name, structure_notes)
         SELECT id, name, structure_notes FROM seed.bible_versions`
      );
      await this._powersync.execute(
        `INSERT OR IGNORE INTO books (id, name, book_number, testament, bible_version_id, global_order)
         SELECT id, name, book_number, testament, bible_version_id, global_order FROM seed.books`
      );
      await this._powersync.execute(
        `INSERT OR IGNORE INTO chapters (id, book_id, chapter_number, total_verses, global_order)
         SELECT id, book_id, chapter_number, total_verses, global_order FROM seed.chapters`
      );
      await this._powersync.execute(
        `INSERT OR IGNORE INTO verses (id, chapter_id, verse_number, global_order)
         SELECT id, chapter_id, verse_number, global_order FROM seed.verses`
      );

      // global_order columns are precomputed in the seed; no runtime UPDATE required

      // Mark as seeded
      await this._powersync.execute(
        "INSERT OR REPLACE INTO __meta (__key, __value) VALUES ('bible_seed_v1', 'done')"
      );

      await this._powersync.execute('COMMIT');
      const elapsedMs = Date.now() - seedStart;
      logger.info(ENABLE_LOGGING, 'PowerSync: Seed completed', {
        attachedFrom,
        elapsedMs,
      });
      if (attached) {
        try {
          await this._powersync.execute('DETACH seed');
        } catch (e) {
          void e;
        }
      }
    } catch (e) {
      await this._powersync.execute('ROLLBACK');
      if (attached) {
        try {
          await this._powersync.execute('DETACH seed');
        } catch (e) {
          void e;
        }
      }
      throw e;
    }
  }

  private async seedBibleStructureIfNeededInBackground(): Promise<void> {
    try {
      await this.seedBibleStructureIfNeeded();
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'PowerSync: background seed failed (non-fatal):',
        e
      );
    }
  }

  /**
   * Execute a SQL query (for reads)
   */
  public async execute(sql: string, parameters?: any[]): Promise<any> {
    return this.database.execute(sql, parameters);
  }

  /**
   * Get all rows from a query
   */
  public async getAll(sql: string, parameters?: any[]): Promise<any[]> {
    return this.database.getAll(sql, parameters);
  }

  /**
   * Get a single row from a query
   */
  public async get(sql: string, parameters?: any[]): Promise<any> {
    return this.database.get(sql, parameters);
  }

  /**
   * Watch a query for changes
   */
  public watch(sql: string, parameters?: any[]) {
    return this.database.watch(sql, parameters);
  }
}

// Export singleton instance
export const powerSyncSystem = PowerSyncSystem.getInstance();
export default PowerSyncSystem;
