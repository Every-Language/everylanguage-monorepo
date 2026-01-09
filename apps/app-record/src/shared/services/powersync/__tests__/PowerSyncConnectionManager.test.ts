import { PowerSyncConnectionManager } from '../PowerSyncConnectionManager';
import { powerSyncSystem } from '../PowerSyncSystem';
import { networkService } from '@/shared/services/network/NetworkService';
import { supabase } from '@/shared/services/api/supabase';

// Mock dependencies
jest.mock('../PowerSyncSystem');
jest.mock('@/shared/services/network/NetworkService');
jest.mock('@/shared/services/api/supabase');
jest.mock('@/shared/utils/logger');

const mockPowerSyncSystem = powerSyncSystem as jest.Mocked<
  typeof powerSyncSystem
>;
const mockNetworkService = networkService as jest.Mocked<typeof networkService>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('PowerSyncConnectionManager', () => {
  let connectionManager: PowerSyncConnectionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset singleton instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (PowerSyncConnectionManager as any).instance = undefined;
    connectionManager = PowerSyncConnectionManager.getInstance();

    // Setup default mocks
    mockPowerSyncSystem.isInitialized = true;
    mockPowerSyncSystem.connect = jest.fn().mockResolvedValue(undefined);
    mockPowerSyncSystem.disconnect = jest.fn().mockResolvedValue(undefined);
    mockNetworkService.checkOnlineCapabilities = jest
      .fn()
      .mockResolvedValue(true);
    mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
          user: { id: 'user-123', is_anonymous: false },
        },
      },
      error: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = PowerSyncConnectionManager.getInstance();
      const instance2 = PowerSyncConnectionManager.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(PowerSyncConnectionManager);
    });
  });

  describe('initialize', () => {
    it('should initialize connection manager', async () => {
      await connectionManager.initialize();

      const state = connectionManager.getState();
      expect(state.isInitialized).toBe(true);
    });

    it('should throw error if PowerSync is not initialized', async () => {
      mockPowerSyncSystem.isInitialized = false;

      await expect(connectionManager.initialize()).rejects.toThrow(
        'PowerSync database must be initialized'
      );
    });

    it('should not reinitialize if already initialized', async () => {
      await connectionManager.initialize();
      jest.clearAllMocks();

      await connectionManager.initialize();

      // Should not throw
      expect(connectionManager.getState().isInitialized).toBe(true);
    });
  });

  describe('attemptConnection', () => {
    beforeEach(async () => {
      await connectionManager.initialize();
    });

    it('should attempt connection successfully', async () => {
      const result = await connectionManager.attemptConnection();

      expect(result).toBe(true);
      expect(mockPowerSyncSystem.connect).toHaveBeenCalled();
      const state = connectionManager.getState();
      expect(state.isConnected).toBe(true);
      expect(state.isConnecting).toBe(false);
    });

    it('should return early if already connecting', async () => {
      // Start a connection attempt
      const promise1 = connectionManager.attemptConnection();
      // Try to start another while first is in progress
      const promise2 = connectionManager.attemptConnection();

      await Promise.all([promise1, promise2]);

      // Should only connect once
      expect(mockPowerSyncSystem.connect).toHaveBeenCalledTimes(1);
    });

    it('should return early if already connected', async () => {
      await connectionManager.attemptConnection();
      jest.clearAllMocks();

      const result = await connectionManager.attemptConnection();

      expect(result).toBe(true);
      expect(mockPowerSyncSystem.connect).not.toHaveBeenCalled();
    });

    it('should handle network connectivity failure', async () => {
      mockNetworkService.checkOnlineCapabilities = jest
        .fn()
        .mockResolvedValue(false);

      const result = await connectionManager.attemptConnection();

      expect(result).toBe(false);
      expect(mockPowerSyncSystem.connect).not.toHaveBeenCalled();
      const state = connectionManager.getState();
      expect(state.isConnected).toBe(false);
      expect(state.connectionError).toBeTruthy();
    });

    it('should handle auth session failure', async () => {
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await connectionManager.attemptConnection();

      expect(result).toBe(false);
      const state = connectionManager.getState();
      expect(state.connectionError).toBeTruthy();
    });

    it('should handle PowerSync connection failure', async () => {
      mockPowerSyncSystem.connect = jest
        .fn()
        .mockRejectedValue(new Error('Connection failed'));

      const result = await connectionManager.attemptConnection();

      expect(result).toBe(false);
      const state = connectionManager.getState();
      expect(state.isConnected).toBe(false);
      expect(state.connectionError).toBeTruthy();
    });
  });

  describe('onUserAuthenticated', () => {
    beforeEach(async () => {
      await connectionManager.initialize();
      await connectionManager.attemptConnection();
    });

    it('should refresh connection when user authenticates', async () => {
      jest.clearAllMocks();

      await connectionManager.onUserAuthenticated();

      expect(mockPowerSyncSystem.disconnect).toHaveBeenCalled();
      expect(mockPowerSyncSystem.connect).toHaveBeenCalled();
      const state = connectionManager.getState();
      expect(state.hasAuthenticatedSession).toBe(true);
      expect(state.hasAnonymousSession).toBe(false);
    });

    it('should handle errors during refresh', async () => {
      mockPowerSyncSystem.connect = jest
        .fn()
        .mockRejectedValue(new Error('Refresh failed'));

      await connectionManager.onUserAuthenticated();

      const state = connectionManager.getState();
      expect(state.connectionError).toBeTruthy();
    });
  });

  describe('onUserSignedOut', () => {
    beforeEach(async () => {
      await connectionManager.initialize();
      await connectionManager.attemptConnection();
    });

    it('should disconnect and switch to anonymous session', async () => {
      jest.clearAllMocks();

      await connectionManager.onUserSignedOut();

      expect(mockPowerSyncSystem.disconnect).toHaveBeenCalled();
      const state = connectionManager.getState();
      expect(state.hasAuthenticatedSession).toBe(false);
      expect(state.hasAnonymousSession).toBe(false);
    });
  });

  describe('forceReconnect', () => {
    beforeEach(async () => {
      await connectionManager.initialize();
    });

    it('should force reconnection', async () => {
      jest.clearAllMocks();

      const result = await connectionManager.forceReconnect();

      expect(result).toBe(true);
      expect(mockPowerSyncSystem.connect).toHaveBeenCalled();
    });

    it('should reset retry count', async () => {
      // Set up a failed state
      mockPowerSyncSystem.connect = jest
        .fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(undefined);

      await connectionManager.attemptConnection(); // This will fail
      jest.clearAllMocks();

      await connectionManager.forceReconnect();

      const state = connectionManager.getState();
      expect(state.connectionError).toBeNull();
    });
  });

  describe('getState', () => {
    it('should return current connection state', () => {
      const state = connectionManager.getState();

      expect(state).toHaveProperty('isInitialized');
      expect(state).toHaveProperty('isConnected');
      expect(state).toHaveProperty('isConnecting');
      expect(state).toHaveProperty('lastConnectionAttempt');
      expect(state).toHaveProperty('connectionError');
      expect(state).toHaveProperty('hasAnonymousSession');
      expect(state).toHaveProperty('hasAuthenticatedSession');
    });

    it('should return a copy of state', () => {
      const state1 = connectionManager.getState();
      const state2 = connectionManager.getState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('subscribe', () => {
    it('should subscribe to state changes', async () => {
      const listener = jest.fn();
      const unsubscribe = connectionManager.subscribe(listener);

      await connectionManager.initialize();

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });

    it('should unsubscribe when called', async () => {
      const listener = jest.fn();
      const unsubscribe = connectionManager.subscribe(listener);

      unsubscribe();
      await connectionManager.initialize();

      // Listener should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    beforeEach(async () => {
      await connectionManager.initialize();
      await connectionManager.attemptConnection();
    });

    it('should disconnect and cleanup', async () => {
      await connectionManager.shutdown();

      expect(mockPowerSyncSystem.disconnect).toHaveBeenCalled();
      const state = connectionManager.getState();
      expect(state.isInitialized).toBe(false);
      expect(state.isConnected).toBe(false);
    });
  });
});
