import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';

const ENABLE_LOGGING = false;

export class SearchIndexService {
  private static instance: SearchIndexService;
  private isInitialized = false;

  public static getInstance(): SearchIndexService {
    if (!SearchIndexService.instance) {
      SearchIndexService.instance = new SearchIndexService();
    }
    return SearchIndexService.instance;
  }

  /**
   * Initialize FTS using PowerSync's migration pattern
   */
  async initializeFTS(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Check if FTS5 is available
      const ftsAvailable = await this.checkFTS5Availability();
      if (!ftsAvailable) {
        logger.warn(
          ENABLE_LOGGING,
          'FTS5 not available, using fallback search'
        );
        this.isInitialized = true;
        return;
      }

      // Create FTS tables using PowerSync pattern
      await this.createFTSTables();
      await this.populateFTSData();
      await this.createSyncTriggers();

      this.isInitialized = true;
      logger.info(ENABLE_LOGGING, 'PowerSync FTS initialization complete');
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'PowerSync FTS initialization failed',
        error
      );
      throw error;
    }
  }

  /**
   * Check if FTS5 module is available
   */
  private async checkFTS5Availability(): Promise<boolean> {
    try {
      await powerSyncSystem.execute('SELECT fts5(?)', ['test']);
      return true;
    } catch (error) {
      logger.warn(ENABLE_LOGGING, 'FTS5 not available:', error);
      return false;
    }
  }

  /**
   * Create FTS virtual tables following PowerSync pattern
   */
  private async createFTSTables(): Promise<void> {
    // Create FTS table for verse_texts
    await powerSyncSystem.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_verse_texts
      USING fts5(
        id UNINDEXED,
        verse_text,
        book_name,
        chapter_number,
        verse_number,
        text_version_id,
        tokenize='unicode61'
      )
    `);

    logger.debug(ENABLE_LOGGING, 'Created fts_verse_texts table');
  }

  /**
   * Populate FTS tables with existing data
   */
  private async populateFTSData(): Promise<void> {
    // Populate verse_texts FTS table
    await powerSyncSystem.execute(`
      INSERT INTO fts_verse_texts(rowid, id, verse_text, book_name, chapter_number, verse_number, text_version_id)
      SELECT 
        vt.rowid,
        vt.id,
        vt.verse_text,
        b.name as book_name,
        c.chapter_number,
        v.verse_number,
        vt.text_version_id
      FROM verse_texts vt
      JOIN verses v ON v.id = vt.verse_id
      JOIN chapters c ON c.id = v.chapter_id
      JOIN books b ON b.id = c.book_id
      WHERE vt.publish_status = 'published' 
        AND vt.deleted_at IS NULL
    `);

    logger.debug(
      ENABLE_LOGGING,
      'Populated fts_verse_texts with existing data'
    );
  }

  /**
   * Create triggers to keep FTS tables in sync
   */
  private async createSyncTriggers(): Promise<void> {
    // INSERT trigger
    await powerSyncSystem.execute(`
      CREATE TRIGGER IF NOT EXISTS fts_insert_trigger_verse_texts AFTER INSERT
      ON verse_texts
      BEGIN
        INSERT INTO fts_verse_texts(rowid, id, verse_text, book_name, chapter_number, verse_number, text_version_id)
        SELECT 
          NEW.rowid,
          NEW.id,
          NEW.verse_text,
          b.name as book_name,
          c.chapter_number,
          v.verse_number,
          NEW.text_version_id
        FROM verses v
        JOIN chapters c ON c.id = v.chapter_id
        JOIN books b ON b.id = c.book_id
        WHERE v.id = NEW.verse_id;
      END
    `);

    // UPDATE trigger
    await powerSyncSystem.execute(`
      CREATE TRIGGER IF NOT EXISTS fts_update_trigger_verse_texts AFTER UPDATE
      ON verse_texts
      BEGIN
        UPDATE fts_verse_texts
        SET 
          verse_text = NEW.verse_text,
          text_version_id = NEW.text_version_id
        WHERE rowid = NEW.rowid;
      END
    `);

    // DELETE trigger
    await powerSyncSystem.execute(`
      CREATE TRIGGER IF NOT EXISTS fts_delete_trigger_verse_texts AFTER DELETE
      ON verse_texts
      BEGIN
        DELETE FROM fts_verse_texts WHERE rowid = OLD.rowid;
      END
    `);

    logger.debug(ENABLE_LOGGING, 'Created FTS sync triggers');
  }

  /**
   * Check if FTS is ready
   */
  async isFTSReady(): Promise<boolean> {
    try {
      const result = await powerSyncSystem.getAll(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='fts_verse_texts'"
      );
      return result.length > 0;
    } catch {
      return false;
    }
  }
}

export const searchIndexService = SearchIndexService.getInstance();
