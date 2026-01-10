import { PowerSyncSystem } from '../PowerSyncSystem';
import {
  PowerSyncDatabase,
  SyncStreamConnectionMethod,
} from '@powersync/react-native';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { AppSchema } from '../../../../powersync/AppSchema';
import { PowerSyncConnector } from '../PowerSyncConnector';

// Mock dependencies
jest.mock('@powersync/react-native');
jest.mock('@powersync/op-sqlite');
jest.mock('../../../../powersync/AppSchema');
jest.mock('../PowerSyncConnector');
jest.mock('@/shared/utils/logger');

describe('PowerSyncSystem', () => {
  let powerSyncSystem: PowerSyncSystem;
  let mockPowerSyncDatabase: jest.Mocked<PowerSyncDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (PowerSyncSystem as any).instance = undefined;
    powerSyncSystem = PowerSyncSystem.getInstance();

    // Mock PowerSyncDatabase
    mockPowerSyncDatabase = {
      init: jest.fn().mockResolvedValue(undefined),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      connected: false,
      currentStatus: null,
      execute: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      watch: jest.fn(),
      getNextCrudTransaction: jest.fn(),
    } as unknown as jest.Mocked<PowerSyncDatabase>;

    // Mock PowerSyncDatabase constructor
    (
      PowerSyncDatabase as jest.MockedClass<typeof PowerSyncDatabase>
    ).mockImplementation(() => mockPowerSyncDatabase);

    // Mock OPSqliteOpenFactory
    const mockFactory = {
      open: jest.fn(),
    };
    (
      OPSqliteOpenFactory as jest.MockedClass<typeof OPSqliteOpenFactory>
    ).mockImplementation(() => mockFactory as unknown as OPSqliteOpenFactory);
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = PowerSyncSystem.getInstance();
      const instance2 = PowerSyncSystem.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(PowerSyncSystem);
    });
  });

  describe('initialize', () => {
    it('should initialize PowerSync database', async () => {
      await powerSyncSystem.initialize();

      expect(PowerSyncDatabase).toHaveBeenCalledWith({
        schema: AppSchema,
        database: expect.any(OPSqliteOpenFactory),
      });
      expect(mockPowerSyncDatabase.init).toHaveBeenCalledTimes(1);
    });

    it('should not reinitialize if already initialized', async () => {
      await powerSyncSystem.initialize();
      jest.clearAllMocks();

      await powerSyncSystem.initialize();

      expect(mockPowerSyncDatabase.init).not.toHaveBeenCalled();
    });
  });

  describe('connect', () => {
    beforeEach(async () => {
      await powerSyncSystem.initialize();
    });

    it('should connect using WebSocket by default', async () => {
      await powerSyncSystem.connect();

      expect(mockPowerSyncDatabase.connect).toHaveBeenCalledWith(
        expect.any(PowerSyncConnector),
        {
          connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET,
        }
      );
    });

    it('should fallback to HTTP streaming if WebSocket fails', async () => {
      mockPowerSyncDatabase.connect
        .mockRejectedValueOnce(new Error('WebSocket failed'))
        .mockResolvedValueOnce(undefined);

      await powerSyncSystem.connect();

      expect(mockPowerSyncDatabase.connect).toHaveBeenCalledTimes(2);
      expect(mockPowerSyncDatabase.connect).toHaveBeenNthCalledWith(
        1,
        expect.any(PowerSyncConnector),
        {
          connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET,
        }
      );
      expect(mockPowerSyncDatabase.connect).toHaveBeenNthCalledWith(
        2,
        expect.any(PowerSyncConnector),
        {
          connectionMethod: SyncStreamConnectionMethod.HTTP,
        }
      );
    });

    it('should throw error if both connection methods fail', async () => {
      mockPowerSyncDatabase.connect.mockRejectedValue(
        new Error('Connection failed')
      );

      await expect(powerSyncSystem.connect()).rejects.toThrow();
    });

    it('should throw error if not initialized', async () => {
      // Reset singleton to get uninitialized instance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (PowerSyncSystem as any).instance = undefined;
      const uninitializedSystem = PowerSyncSystem.getInstance();

      await expect(uninitializedSystem.connect()).rejects.toThrow(
        'PowerSync database not initialized'
      );
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      await powerSyncSystem.initialize();
    });

    it('should disconnect from PowerSync', async () => {
      await powerSyncSystem.disconnect();

      expect(mockPowerSyncDatabase.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle disconnect when not initialized gracefully', async () => {
      // Reset singleton to get uninitialized instance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (PowerSyncSystem as any).instance = undefined;
      const uninitializedSystem = PowerSyncSystem.getInstance();

      await expect(uninitializedSystem.disconnect()).resolves.not.toThrow();
    });
  });

  describe('isInitialized', () => {
    it('should return false when not initialized', () => {
      expect(powerSyncSystem.isInitialized).toBe(false);
    });

    it('should return true after initialization', async () => {
      await powerSyncSystem.initialize();
      expect(powerSyncSystem.isInitialized).toBe(true);
    });
  });

  describe('isConnected', () => {
    beforeEach(async () => {
      await powerSyncSystem.initialize();
    });

    it('should return false when not connected', () => {
      mockPowerSyncDatabase.connected = false;
      expect(powerSyncSystem.isConnected).toBe(false);
    });

    it('should return true when connected', async () => {
      mockPowerSyncDatabase.connected = true;
      expect(powerSyncSystem.isConnected).toBe(true);
    });
  });

  describe('getStatus', () => {
    beforeEach(async () => {
      await powerSyncSystem.initialize();
    });

    it('should return status information', () => {
      mockPowerSyncDatabase.connected = true;
      mockPowerSyncDatabase.currentStatus = 'connected';

      const status = powerSyncSystem.getStatus();

      expect(status).toEqual({
        initialized: true,
        connected: true,
        connectionMethod: 'WebSocket',
        status: 'connected',
      });
    });

    it('should return HTTP Streaming when using HTTP method', async () => {
      await powerSyncSystem.connect();
      // Simulate HTTP fallback
      mockPowerSyncDatabase.connected = true;

      // Manually set connection method to HTTP for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (powerSyncSystem as any)._connectionMethod =
        SyncStreamConnectionMethod.HTTP;

      const status = powerSyncSystem.getStatus();

      expect(status.connectionMethod).toBe('HTTP Streaming');
    });
  });

  describe('getConnectionMethod', () => {
    it('should return WebSocket by default', () => {
      expect(powerSyncSystem.getConnectionMethod()).toBe('WebSocket');
    });

    it('should return HTTP Streaming when set', () => {
      powerSyncSystem.setConnectionMethod(SyncStreamConnectionMethod.HTTP);
      expect(powerSyncSystem.getConnectionMethod()).toBe('HTTP Streaming');
    });
  });

  describe('database getter', () => {
    it('should throw error when not initialized', () => {
      // Reset singleton to get uninitialized instance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (PowerSyncSystem as any).instance = undefined;
      const uninitializedSystem = PowerSyncSystem.getInstance();

      expect(() => uninitializedSystem.database).toThrow(
        'PowerSync database not initialized'
      );
    });

    it('should return database instance when initialized', async () => {
      await powerSyncSystem.initialize();

      expect(powerSyncSystem.database).toBe(mockPowerSyncDatabase);
    });
  });
});
