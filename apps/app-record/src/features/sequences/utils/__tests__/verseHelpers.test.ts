import { findFirstVerseId, findLastVerseId } from '../verseHelpers';
import { powerSyncSystem } from '@/shared/infrastructure/powersync/services/PowerSyncSystem';

// Mock PowerSync system
jest.mock('@/shared/infrastructure/powersync/services/PowerSyncSystem');

const mockPowerSyncSystem = powerSyncSystem as jest.Mocked<
  typeof powerSyncSystem
>;

const setIsInitialized = (value: boolean): void => {
  Object.defineProperty(mockPowerSyncSystem, 'isInitialized', {
    configurable: true,
    get: () => value,
  });
};

describe('verseHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setIsInitialized(true);
  });

  describe('findFirstVerseId', () => {
    it('should return the first verse ID for a chapter', async () => {
      const chapterId = 'chapter-123';
      const mockVerse = [{ id: 'verse-1' }];

      mockPowerSyncSystem.getAll.mockResolvedValue(mockVerse);

      const result = await findFirstVerseId(chapterId);

      expect(result).toBe('verse-1');
      expect(mockPowerSyncSystem.getAll).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM verses'),
        [chapterId]
      );
      expect(mockPowerSyncSystem.getAll).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY verse_number ASC'),
        [chapterId]
      );
    });

    it('should return null when no verses are found', async () => {
      const chapterId = 'chapter-123';

      mockPowerSyncSystem.getAll.mockResolvedValue([]);

      const result = await findFirstVerseId(chapterId);

      expect(result).toBeNull();
    });

    it('should throw error when PowerSync is not initialized', async () => {
      const chapterId = 'chapter-123';
      setIsInitialized(false);

      await expect(findFirstVerseId(chapterId)).rejects.toThrow(
        'PowerSync database not initialized'
      );
    });

    it('should handle database errors', async () => {
      const chapterId = 'chapter-123';
      const dbError = new Error('Database connection failed');

      mockPowerSyncSystem.getAll.mockRejectedValue(dbError);

      await expect(findFirstVerseId(chapterId)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle empty result array', async () => {
      const chapterId = 'chapter-123';

      mockPowerSyncSystem.getAll.mockResolvedValue([]);

      const result = await findFirstVerseId(chapterId);

      expect(result).toBeNull();
    });
  });

  describe('findLastVerseId', () => {
    it('should return the last verse ID for a chapter', async () => {
      const chapterId = 'chapter-123';
      const mockVerse = [{ id: 'verse-50' }];

      mockPowerSyncSystem.getAll.mockResolvedValue(mockVerse);

      const result = await findLastVerseId(chapterId);

      expect(result).toBe('verse-50');
      expect(mockPowerSyncSystem.getAll).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM verses'),
        [chapterId]
      );
      expect(mockPowerSyncSystem.getAll).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY verse_number DESC'),
        [chapterId]
      );
    });

    it('should return null when no verses are found', async () => {
      const chapterId = 'chapter-123';

      mockPowerSyncSystem.getAll.mockResolvedValue([]);

      const result = await findLastVerseId(chapterId);

      expect(result).toBeNull();
    });

    it('should throw error when PowerSync is not initialized', async () => {
      const chapterId = 'chapter-123';
      setIsInitialized(false);

      await expect(findLastVerseId(chapterId)).rejects.toThrow(
        'PowerSync database not initialized'
      );
    });

    it('should handle database errors', async () => {
      const chapterId = 'chapter-123';
      const dbError = new Error('Database query failed');

      mockPowerSyncSystem.getAll.mockRejectedValue(dbError);

      await expect(findLastVerseId(chapterId)).rejects.toThrow(
        'Database query failed'
      );
    });
  });
});
