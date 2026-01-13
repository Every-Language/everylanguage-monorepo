import { PowerSyncDatabase } from '@powersync/react-native';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { PowerSyncConnector } from '../PowerSyncConnector';
import { logger } from '@/shared/utils/logger';
import { AppSchema } from '@/powersync/AppSchema';

// Unmock PowerSyncSystem to test the real implementation
jest.unmock('@/shared/infrastructure/powersync/services/PowerSyncSystem');

// Mock dependencies
jest.mock('@powersync/react-native', () => ({
  PowerSyncDatabase: jest.fn(),
  UpdateType: {
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
  },
}));
jest.mock('@powersync/op-sqlite', () => ({
  OPSqliteOpenFactory: jest.fn(),
}));
jest.mock('../PowerSyncConnector');
jest.mock('@/shared/utils/logger');
jest.mock('@/powersync/AppSchema', () => ({}));
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/documentDirectory/',
  getInfoAsync: jest.fn(),
  copyAsync: jest.fn(),
}));
jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(),
  },
}));

// Import after unmocking
import PowerSyncSystem, { powerSyncSystem } from '../PowerSyncSystem';

const mockPowerSyncDatabase = PowerSyncDatabase as jest.MockedClass<
  typeof PowerSyncDatabase
>;
const mockOPSqliteOpenFactory = OPSqliteOpenFactory as jest.MockedClass<
  typeof OPSqliteOpenFactory
>;
const mockPowerSyncConnector = PowerSyncConnector as jest.MockedClass<
  typeof PowerSyncConnector
>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('PowerSyncSystem', () => {
  let mockPowerSyncInstance: jest.Mocked<PowerSyncDatabase>;
  let mockOpSqliteFactoryInstance: jest.Mocked<OPSqliteOpenFactory>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance for each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (PowerSyncSystem as any).instance = undefined;

    // Mock PowerSyncDatabase instance
    mockPowerSyncInstance = {
      init: jest.fn().mockResolvedValue(undefined),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn().mockResolvedValue(undefined),
      getAll: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue(null),
      watch: jest.fn().mockReturnValue({
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      }),
      connected: false,
      currentStatus: null,
    } as any;

    mockPowerSyncDatabase.mockImplementation(() => mockPowerSyncInstance);

    // Mock OPSqliteOpenFactory instance
    mockOpSqliteFactoryInstance = {} as any;
    mockOPSqliteOpenFactory.mockImplementation(
      () => mockOpSqliteFactoryInstance
    );
  });

  describe('getInstance', () => {
    it('should return the same singleton instance', () => {
      const instance1 = PowerSyncSystem.getInstance();
      const instance2 = PowerSyncSystem.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize PowerSync database successfully', async () => {
      const system = PowerSyncSystem.getInstance();

      await system.initialize();

      expect(mockOPSqliteOpenFactory).toHaveBeenCalledWith({
        dbFilename: 'powersync-everylanguage.db',
      });
      expect(mockPowerSyncDatabase).toHaveBeenCalledWith({
        schema: AppSchema,
        database: mockOpSqliteFactoryInstance,
      });
      expect(mockPowerSyncInstance.init).toHaveBeenCalledTimes(1);
      expect(system.isInitialized).toBe(true);
    });

    it('should be idempotent - not reinitialize if already initialized', async () => {
      const system = PowerSyncSystem.getInstance();

      await system.initialize();
      await system.initialize();

      expect(mockPowerSyncDatabase).toHaveBeenCalledTimes(1);
      expect(mockPowerSyncInstance.init).toHaveBeenCalledTimes(1);
    });

    it('should throw error if initialization fails', async () => {
      const initError = new Error('Init failed');
      mockPowerSyncInstance.init.mockRejectedValueOnce(initError);

      const system = PowerSyncSystem.getInstance();

      await expect(system.initialize()).rejects.toThrow('Init failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'PowerSync: Failed to initialize database:',
        initError
      );
      expect(system.isInitialized).toBe(false);
    });
  });

  describe('connect', () => {
    it('should connect to PowerSync backend', async () => {
      const system = PowerSyncSystem.getInstance();
      await system.initialize();

      await system.connect();

      expect(mockPowerSyncConnector).toHaveBeenCalledTimes(1);
      expect(mockPowerSyncInstance.connect).toHaveBeenCalledTimes(1);
      expect(mockPowerSyncInstance.connect).toHaveBeenCalledWith(
        expect.any(PowerSyncConnector)
      );
    });

    it('should throw error if not initialized', async () => {
      const system = PowerSyncSystem.getInstance();

      await expect(system.connect()).rejects.toThrow(
        'PowerSync database not initialized'
      );
    });

    it('should wait for seed to complete before connecting', async () => {
      const system = PowerSyncSystem.getInstance();
      await system.initialize();

      // Mock seed promise to be pending initially
      let resolveSeed: () => void;
      const seedPromise = new Promise<void>(resolve => {
        resolveSeed = resolve;
      });

      // Access private _seedPromise through the instance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (system as any)._seedPromise = seedPromise;

      const connectPromise = system.connect();

      // Seed should be awaited before connect completes
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockPowerSyncInstance.connect).not.toHaveBeenCalled();

      resolveSeed!();
      await connectPromise;

      expect(mockPowerSyncInstance.connect).toHaveBeenCalledTimes(1);
    });

    it('should continue connecting even if seed fails', async () => {
      const system = PowerSyncSystem.getInstance();
      await system.initialize();

      const seedError = new Error('Seed failed');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (system as any)._seedPromise = Promise.reject(seedError);

      await system.connect();

      // Should still connect despite seed failure
      expect(mockPowerSyncInstance.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from PowerSync backend', async () => {
      const system = PowerSyncSystem.getInstance();
      await system.initialize();

      await system.disconnect();

      expect(mockPowerSyncInstance.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should not throw error if not initialized', async () => {
      const system = PowerSyncSystem.getInstance();

      await expect(system.disconnect()).resolves.not.toThrow();
    });
  });

  describe('database getter', () => {
    it('should return PowerSync database instance', () => {
      const system = PowerSyncSystem.getInstance();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (system as any)._powersync = mockPowerSyncInstance;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (system as any)._isInitialized = true;

      const db = system.database;

      expect(db).toBe(mockPowerSyncInstance);
    });

    it('should throw error if not initialized', () => {
      const system = PowerSyncSystem.getInstance();

      expect(() => system.database).toThrow(
        'PowerSync database not initialized'
      );
    });
  });

  describe('isInitialized getter', () => {
    it('should return true when initialized', async () => {
      const system = PowerSyncSystem.getInstance();
      await system.initialize();

      expect(system.isInitialized).toBe(true);
    });

    it('should return false when not initialized', () => {
      const system = PowerSyncSystem.getInstance();

      expect(system.isInitialized).toBe(false);
    });
  });

  describe('isConnected getter', () => {
    it('should return true when connected', async () => {
      const system = PowerSyncSystem.getInstance();
      await system.initialize();
      mockPowerSyncInstance.connected = true;

      expect(system.isConnected).toBe(true);
    });

    it('should return false when not connected', async () => {
      const system = PowerSyncSystem.getInstance();
      await system.initialize();
      mockPowerSyncInstance.connected = false;

      expect(system.isConnected).toBe(false);
    });

    it('should return false when not initialized', () => {
      const system = PowerSyncSystem.getInstance();

      expect(system.isConnected).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return status information', async () => {
      const system = PowerSyncSystem.getInstance();
      await system.initialize();
      mockPowerSyncInstance.connected = true;
      mockPowerSyncInstance.currentStatus = 'connected' as any;

      const status = system.getStatus();

      expect(status).toEqual({
        initialized: true,
        connected: true,
        status: 'connected',
      });
    });

    it('should return status with null values when not initialized', () => {
      const system = PowerSyncSystem.getInstance();

      const status = system.getStatus();

      expect(status).toEqual({
        initialized: false,
        connected: false,
        status: null,
      });
    });
  });

  describe('execute', () => {
    it('should execute SQL query', async () => {
      const system = PowerSyncSystem.getInstance();
      await system.initialize();
      mockPowerSyncInstance.execute.mockResolvedValueOnce({ affectedRows: 1 });

      const result = await system.execute('SELECT * FROM projects', []);

      expect(mockPowerSyncInstance.execute).toHaveBeenCalledWith(
        'SELECT * FROM projects',
        []
      );
      expect(result).toEqual({ affectedRows: 1 });
    });

    it('should throw error if not initialized', () => {
      const system = PowerSyncSystem.getInstance();

      expect(() => system.execute('SELECT 1', [])).rejects.toThrow(
        'PowerSync database not initialized'
      );
    });
  });

  describe('getAll', () => {
    it('should get all rows from query', async () => {
      const system = PowerSyncSystem.getInstance();
      await system.initialize();
      const mockRows = [{ id: '1', name: 'Project 1' }];
      mockPowerSyncInstance.getAll.mockResolvedValueOnce(mockRows);

      const result = await system.getAll('SELECT * FROM projects', []);

      expect(mockPowerSyncInstance.getAll).toHaveBeenCalledWith(
        'SELECT * FROM projects',
        []
      );
      expect(result).toEqual(mockRows);
    });

    it('should throw error if not initialized', () => {
      const system = PowerSyncSystem.getInstance();

      expect(() => system.getAll('SELECT * FROM projects', [])).rejects.toThrow(
        'PowerSync database not initialized'
      );
    });
  });

  describe('get', () => {
    it('should get single row from query', async () => {
      const system = PowerSyncSystem.getInstance();
      await system.initialize();
      const mockRow = { id: '1', name: 'Project 1' };
      mockPowerSyncInstance.get.mockResolvedValueOnce(mockRow);

      const result = await system.get('SELECT * FROM projects WHERE id = ?', [
        '1',
      ]);

      expect(mockPowerSyncInstance.get).toHaveBeenCalledWith(
        'SELECT * FROM projects WHERE id = ?',
        ['1']
      );
      expect(result).toEqual(mockRow);
    });

    it('should throw error if not initialized', () => {
      const system = PowerSyncSystem.getInstance();

      expect(() =>
        system.get('SELECT * FROM projects WHERE id = ?', ['1'])
      ).rejects.toThrow('PowerSync database not initialized');
    });
  });

  describe('watch', () => {
    it('should watch query for changes', () => {
      const system = PowerSyncSystem.getInstance();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (system as any)._powersync = mockPowerSyncInstance;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (system as any)._isInitialized = true;

      const watcher = system.watch('SELECT * FROM projects', []);

      expect(mockPowerSyncInstance.watch).toHaveBeenCalledWith(
        'SELECT * FROM projects',
        []
      );
      expect(watcher).toBeDefined();
    });

    it('should throw error if not initialized', () => {
      const system = PowerSyncSystem.getInstance();

      expect(() => system.watch('SELECT * FROM projects', [])).toThrow(
        'PowerSync database not initialized'
      );
    });
  });

  describe('singleton instance export', () => {
    it('should export singleton instance', () => {
      expect(powerSyncSystem).toBeDefined();
      expect(powerSyncSystem).toBeInstanceOf(PowerSyncSystem);
    });

    it('should return same instance on multiple imports', () => {
      const instance1 = powerSyncSystem;
      const instance2 = powerSyncSystem;
      expect(instance1).toBe(instance2);
    });
  });
});
