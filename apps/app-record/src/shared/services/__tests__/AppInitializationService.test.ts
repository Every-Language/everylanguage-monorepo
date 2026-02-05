import { appInitializationService } from '../AppInitializationService';
import { powerSyncSystem } from '@/shared/infrastructure/powersync/services/PowerSyncSystem';
import { initializeAllStores } from '@/shared/store';
import { useAuthStore } from '@/shared/auth/store/authStore';

// Mock dependencies
jest.mock('@/shared/infrastructure/powersync/services/PowerSyncSystem');
jest.mock('@/shared/store');
jest.mock('@/shared/auth/store/authStore');
jest.mock('@/shared/utils/logger');

const mockPowerSyncSystem = powerSyncSystem as jest.Mocked<
  typeof powerSyncSystem
>;
const mockInitializeAllStores = initializeAllStores as jest.MockedFunction<
  typeof initializeAllStores
>;
const mockUseAuthStore = useAuthStore as jest.Mocked<typeof useAuthStore>;

describe('AppInitializationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state for each test
    appInitializationService.reset();

    // Setup default mocks
    mockPowerSyncSystem.initialize.mockResolvedValue(undefined);
    mockInitializeAllStores.mockResolvedValue(undefined);
    mockUseAuthStore.getState.mockReturnValue({
      initialize: jest.fn().mockResolvedValue(undefined),
    } as any);
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = appInitializationService;
      const instance2 = appInitializationService;

      expect(instance1).toBe(instance2);
    });
  });

  describe('initializeApp', () => {
    it('should initialize app successfully', async () => {
      await appInitializationService.initializeApp();

      expect(mockPowerSyncSystem.initialize).toHaveBeenCalledTimes(1);
      expect(mockInitializeAllStores).toHaveBeenCalledTimes(1);
      expect(mockUseAuthStore.getState).toHaveBeenCalled();
    });

    it('should initialize PowerSync first', async () => {
      const callOrder: string[] = [];

      mockPowerSyncSystem.initialize.mockImplementation(async () => {
        callOrder.push('powersync');
        return Promise.resolve();
      });

      mockInitializeAllStores.mockImplementation(async () => {
        callOrder.push('stores');
        return Promise.resolve();
      });

      await appInitializationService.initializeApp();

      expect(callOrder[0]).toBe('powersync');
      expect(callOrder[1]).toBe('stores');
    });

    it('should initialize stores after PowerSync', async () => {
      await appInitializationService.initializeApp();

      const powerSyncCallOrder =
        mockPowerSyncSystem.initialize.mock.invocationCallOrder[0];
      const storesCallOrder =
        mockInitializeAllStores.mock.invocationCallOrder[0];
      if (powerSyncCallOrder === undefined || storesCallOrder === undefined) {
        throw new Error('Expected initialize call order data');
      }

      expect(storesCallOrder).toBeGreaterThan(powerSyncCallOrder);
    });

    it('should initialize auth store after stores', async () => {
      await appInitializationService.initializeApp();

      const storesCallOrder =
        mockInitializeAllStores.mock.invocationCallOrder[0];
      const authStoreCallOrder =
        mockUseAuthStore.getState.mock.invocationCallOrder[0];
      if (storesCallOrder === undefined || authStoreCallOrder === undefined) {
        throw new Error('Expected initialize call order data');
      }

      expect(authStoreCallOrder).toBeGreaterThan(storesCallOrder);
    });

    it('should be idempotent - only initialize once on multiple calls', async () => {
      // Reset first to ensure clean state
      appInitializationService.reset();

      const promise1 = appInitializationService.initializeApp();
      const promise2 = appInitializationService.initializeApp();
      const promise3 = appInitializationService.initializeApp();

      // Wait for all promises (they should all resolve to the same result)
      await Promise.all([promise1, promise2, promise3]);

      // Should only initialize once despite multiple calls
      expect(mockPowerSyncSystem.initialize).toHaveBeenCalledTimes(1);
      expect(mockInitializeAllStores).toHaveBeenCalledTimes(1);
    });

    it('should continue initialization even if PowerSync fails', async () => {
      const powerSyncError = new Error('PowerSync init failed');
      mockPowerSyncSystem.initialize.mockRejectedValue(powerSyncError);

      await appInitializationService.initializeApp();

      // Should still initialize stores
      expect(mockInitializeAllStores).toHaveBeenCalledTimes(1);
      expect(mockUseAuthStore.getState).toHaveBeenCalled();
    });

    it('should handle auth store initialization failure gracefully', async () => {
      const authError = new Error('Auth init failed');
      mockUseAuthStore.getState.mockReturnValue({
        initialize: jest.fn().mockRejectedValue(authError),
      } as any);

      // Should not throw
      await expect(
        appInitializationService.initializeApp()
      ).resolves.not.toThrow();

      expect(mockPowerSyncSystem.initialize).toHaveBeenCalled();
      expect(mockInitializeAllStores).toHaveBeenCalled();
    });

    it('should reset promise on initialization failure', async () => {
      const initError = new Error('Store init failed');
      mockInitializeAllStores.mockRejectedValueOnce(initError);

      try {
        await appInitializationService.initializeApp();
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Expected error
        expect(error).toBe(initError);
      }

      // Promise should be reset after failure, allowing retry
      // Reset mocks for retry
      mockInitializeAllStores.mockResolvedValueOnce(undefined);
      mockPowerSyncSystem.initialize.mockResolvedValueOnce(undefined);

      await appInitializationService.initializeApp();

      // Should have attempted initialization twice (once failed, once succeeded)
      expect(mockPowerSyncSystem.initialize).toHaveBeenCalledTimes(2);
      expect(mockInitializeAllStores).toHaveBeenCalledTimes(2);
    });

    it('should allow retry after reset', async () => {
      // First attempt fails
      mockInitializeAllStores.mockRejectedValueOnce(
        new Error('First attempt failed')
      );

      await expect(appInitializationService.initializeApp()).rejects.toThrow();

      // Reset
      appInitializationService.reset();

      // Second attempt succeeds
      mockInitializeAllStores.mockResolvedValueOnce(undefined);

      await appInitializationService.initializeApp();

      expect(mockInitializeAllStores).toHaveBeenCalledTimes(2);
    });
  });

  describe('reset', () => {
    it('should reset initialization promise', () => {
      // Start initialization
      const promise1 = appInitializationService.initializeApp();

      // Reset
      appInitializationService.reset();

      // Next call should create new promise
      const promise2 = appInitializationService.initializeApp();

      expect(promise1).not.toBe(promise2);
    });

    it('should allow new initialization after reset', async () => {
      await appInitializationService.initializeApp();

      appInitializationService.reset();

      await appInitializationService.initializeApp();

      // Should initialize twice
      expect(mockPowerSyncSystem.initialize).toHaveBeenCalledTimes(2);
      expect(mockInitializeAllStores).toHaveBeenCalledTimes(2);
    });
  });
});
