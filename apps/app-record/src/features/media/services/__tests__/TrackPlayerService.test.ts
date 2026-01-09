import { TrackPlayerService } from '../TrackPlayerService';
import TrackPlayer from 'react-native-track-player';
import { logger } from '@/shared/utils/logger';

// Mock external dependencies
jest.mock('react-native-track-player');
jest.mock('@/shared/utils/logger');

const mockTrackPlayer = TrackPlayer as jest.Mocked<typeof TrackPlayer>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('TrackPlayerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset static state before each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (TrackPlayerService as any).isInitialized = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (TrackPlayerService as any).initializationPromise = null;
  });

  describe('initialize', () => {
    it('should initialize TrackPlayer successfully on first call', async () => {
      mockTrackPlayer.setupPlayer.mockResolvedValue(undefined);
      mockTrackPlayer.updateOptions.mockResolvedValue(undefined);

      await TrackPlayerService.initialize();

      expect(mockTrackPlayer.setupPlayer).toHaveBeenCalledTimes(1);
      expect(mockTrackPlayer.setupPlayer).toHaveBeenCalledWith({
        minBuffer: 15,
        maxBuffer: 60,
        playBuffer: 2.5,
        backBuffer: 10,
        maxCacheSize: 50 * 1024,
        androidAudioContentType: 'speech',
        iosCategory: 'playback',
        iosCategoryMode: 'spokenAudio',
        iosCategoryOptions: [],
        autoHandleInterruptions: true,
        autoUpdateMetadata: true,
      });

      expect(mockTrackPlayer.updateOptions).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        true,
        'TrackPlayer initialized successfully'
      );
    });

    it('should skip initialization if already initialized', async () => {
      // First initialization
      await TrackPlayerService.initialize();
      jest.clearAllMocks();

      // Second initialization should be skipped
      await TrackPlayerService.initialize();

      expect(mockTrackPlayer.setupPlayer).not.toHaveBeenCalled();
      expect(mockTrackPlayer.updateOptions).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        true,
        'TrackPlayer already initialized, skipping...'
      );
    });

    it('should handle concurrent initialization calls with promise synchronization', async () => {
      mockTrackPlayer.setupPlayer.mockResolvedValue(undefined);
      mockTrackPlayer.updateOptions.mockResolvedValue(undefined);

      // Start multiple concurrent initialization calls
      const promise1 = TrackPlayerService.initialize();
      const promise2 = TrackPlayerService.initialize();
      const promise3 = TrackPlayerService.initialize();

      await Promise.all([promise1, promise2, promise3]);

      // Should only call setupPlayer once despite multiple calls
      expect(mockTrackPlayer.setupPlayer).toHaveBeenCalledTimes(1);
      expect(mockTrackPlayer.updateOptions).toHaveBeenCalledTimes(1);
    });

    it('should handle already initialized error gracefully', async () => {
      const alreadyInitializedError = new Error(
        'The player has already been initialized via setupPlayer.'
      );
      (alreadyInitializedError as Error & { code: string }).code =
        'player_already_initialized';

      mockTrackPlayer.setupPlayer.mockRejectedValue(alreadyInitializedError);
      mockTrackPlayer.updateOptions.mockResolvedValue(undefined);

      await TrackPlayerService.initialize();

      expect(mockTrackPlayer.setupPlayer).toHaveBeenCalledTimes(1);
      expect(mockTrackPlayer.updateOptions).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        true,
        'TrackPlayer already initialized, continuing with options setup...'
      );
    });

    it('should throw error for non-initialization errors', async () => {
      const setupError = new Error('Setup failed');
      mockTrackPlayer.setupPlayer.mockRejectedValue(setupError);

      await expect(TrackPlayerService.initialize()).rejects.toThrow(
        'Setup failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        true,
        'Failed to initialize TrackPlayer:',
        setupError
      );
    });

    it('should reset initialization promise on failure', async () => {
      const setupError = new Error('Setup failed');
      mockTrackPlayer.setupPlayer.mockRejectedValue(setupError);

      try {
        await TrackPlayerService.initialize();
      } catch {
        // Expected to throw
      }

      // Should allow retry after failure
      mockTrackPlayer.setupPlayer.mockResolvedValue(undefined);
      mockTrackPlayer.updateOptions.mockResolvedValue(undefined);

      await TrackPlayerService.initialize();
      expect(mockTrackPlayer.setupPlayer).toHaveBeenCalledTimes(2);
    });

    it('should handle updateOptions failure', async () => {
      mockTrackPlayer.setupPlayer.mockResolvedValue(undefined);
      const updateError = new Error('Update options failed');
      mockTrackPlayer.updateOptions.mockRejectedValue(updateError);

      await expect(TrackPlayerService.initialize()).rejects.toThrow(
        'Update options failed'
      );
    });
  });

  describe('reset', () => {
    it('should reset TrackPlayer and clear initialization state', async () => {
      // First initialize
      mockTrackPlayer.setupPlayer.mockResolvedValue(undefined);
      mockTrackPlayer.updateOptions.mockResolvedValue(undefined);
      await TrackPlayerService.initialize();
      jest.clearAllMocks();

      // Then reset
      await TrackPlayerService.reset();

      expect(mockTrackPlayer.reset).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        true,
        'TrackPlayer reset completed'
      );

      // Should allow re-initialization after reset
      mockTrackPlayer.setupPlayer.mockResolvedValue(undefined);
      mockTrackPlayer.updateOptions.mockResolvedValue(undefined);

      await TrackPlayerService.initialize();
      expect(mockTrackPlayer.setupPlayer).toHaveBeenCalledTimes(1);
    });

    it('should handle reset errors gracefully', async () => {
      const resetError = new Error('Reset failed');
      mockTrackPlayer.reset.mockRejectedValue(resetError);

      await TrackPlayerService.reset();

      expect(mockTrackPlayer.reset).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        true,
        'TrackPlayer reset error (ignored):',
        resetError
      );
    });
  });

  describe('initialized getter', () => {
    it('should return false before initialization', () => {
      expect(TrackPlayerService.initialized).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      mockTrackPlayer.setupPlayer.mockResolvedValue(undefined);
      mockTrackPlayer.updateOptions.mockResolvedValue(undefined);

      await TrackPlayerService.initialize();

      expect(TrackPlayerService.initialized).toBe(true);
    });

    it('should return false after reset', async () => {
      // Initialize first
      await TrackPlayerService.initialize();
      expect(TrackPlayerService.initialized).toBe(true);

      // Reset
      await TrackPlayerService.reset();
      expect(TrackPlayerService.initialized).toBe(false);
    });
  });

  describe('initialization promise handling', () => {
    it('should wait for ongoing initialization', async () => {
      // Create a promise that we can control
      let resolveSetup: () => void;
      const setupPromise = new Promise<void>(resolve => {
        resolveSetup = resolve;
      });
      mockTrackPlayer.setupPlayer.mockReturnValue(setupPromise);
      mockTrackPlayer.updateOptions.mockResolvedValue(undefined);

      // Start first initialization
      const firstInit = TrackPlayerService.initialize();

      // Start second initialization while first is still pending
      const secondInit = TrackPlayerService.initialize();

      // Resolve the setup
      resolveSetup!();

      await Promise.all([firstInit, secondInit]);

      // Should only call setupPlayer once
      expect(mockTrackPlayer.setupPlayer).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization promise rejection', async () => {
      const setupError = new Error('Setup failed');
      mockTrackPlayer.setupPlayer.mockRejectedValue(setupError);

      // Start multiple concurrent calls
      const promise1 = TrackPlayerService.initialize();
      const promise2 = TrackPlayerService.initialize();

      await expect(Promise.all([promise1, promise2])).rejects.toThrow(
        'Setup failed'
      );

      // Should allow retry after all promises are rejected
      mockTrackPlayer.setupPlayer.mockResolvedValue(undefined);
      mockTrackPlayer.updateOptions.mockResolvedValue(undefined);

      await TrackPlayerService.initialize();
      expect(mockTrackPlayer.setupPlayer).toHaveBeenCalledTimes(2);
    });
  });
});
