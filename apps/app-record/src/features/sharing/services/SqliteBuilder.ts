import * as FileSystem from 'expo-file-system';

/**
 * Utility to create a temporary SQLite database file and populate tables via INSERT OR REPLACE.
 * Uses OP-SQLite factory to ensure compatibility with app runtime.
 */
export class SqliteBuilder {
  private dbFilename: string;

  constructor(filename: string) {
    this.dbFilename = filename;
  }

  async init(): Promise<void> {
    // Lazy import to avoid large dependency at module load
    await import('@powersync/react-native');
    // Create empty DB file
    // Note: We are not using PowerSync Schema here; we create tables with CREATE TABLE statements provided by caller.
  }

  get path(): string {
    return `${FileSystem.documentDirectory}${this.dbFilename}`;
  }
}
