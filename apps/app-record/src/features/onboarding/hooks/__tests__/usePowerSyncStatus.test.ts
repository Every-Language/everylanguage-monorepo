import { renderHook, waitFor, act } from '@testing-library/react-native';
import { usePowerSyncStatus } from '../usePowerSyncStatus';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { powerSyncConnectionManager } from '@/shared/services/powersync/PowerSyncConnectionManager';

// Mock dependencies
jest.mock('@/shared/services/powersync/PowerSyncSystem');
jest.mock('@/shared/services/powersync/PowerSyncConnectionManager');

const mockPowerSyncSystem = powerSyncSystem as jest.Mocked<
  typeof powerSyncSystem
>;
const mockPowerSyncConnectionManager =
  powerSyncConnectionManager as jest.Mocked<typeof powerSyncConnectionManager>;

describe('usePowerSyncStatus', () => {
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUnsubscribe = jest.fn();

    // Setup default mocks
    mockPowerSyncSystem.getStatus = jest.fn().mockReturnValue({
      initialized: true,
      connected: true,
      connectionMethod: 'WebSocket',
      status: 'connected',
    });

    mockPowerSyncConnectionManager.getState = jest.fn().mockReturnValue({
      isInitialized: true,
      isConnected: true,
      isConnecting: false,
      lastConnectionAttempt: Date.now(),
      connectionError: null,
      hasAnonymousSession: false,
      hasAuthenticatedSession: true,
    });

    mockPowerSyncConnectionManager.subscribe = jest
      .fn()
      .mockReturnValue(mockUnsubscribe);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return initial status', () => {
    const { result } = renderHook(() => usePowerSyncStatus());

    expect(result.current).toEqual({
      initialized: true,
      connected: true,
      connecting: false,
      connectionMethod: 'WebSocket',
      syncStatus: 'connected',
      error: null,
    });
  });

  it('should update status when connection manager state changes', async () => {
    const { result } = renderHook(() => usePowerSyncStatus());

    // Get the listener callback
    const subscribeCall =
      mockPowerSyncConnectionManager.subscribe.mock.calls[0];
    const listener = subscribeCall[0];

    // Simulate state change
    mockPowerSyncConnectionManager.getState.mockReturnValue({
      isInitialized: true,
      isConnected: false,
      isConnecting: true,
      lastConnectionAttempt: Date.now(),
      connectionError: null,
      hasAnonymousSession: false,
      hasAuthenticatedSession: false,
    });

    act(() => {
      listener(mockPowerSyncConnectionManager.getState());
    });

    await waitFor(() => {
      expect(result.current.connecting).toBe(true);
      expect(result.current.connected).toBe(false);
    });
  });

  it('should show error when connection has error', () => {
    mockPowerSyncConnectionManager.getState.mockReturnValue({
      isInitialized: true,
      isConnected: false,
      isConnecting: false,
      lastConnectionAttempt: Date.now(),
      connectionError: 'Connection failed',
      hasAnonymousSession: false,
      hasAuthenticatedSession: false,
    });

    const { result } = renderHook(() => usePowerSyncStatus());

    expect(result.current.error).toBe('Connection failed');
    expect(result.current.connected).toBe(false);
  });

  it('should show HTTP Streaming connection method', () => {
    mockPowerSyncSystem.getStatus.mockReturnValue({
      initialized: true,
      connected: true,
      connectionMethod: 'HTTP Streaming',
      status: 'connected',
    });

    const { result } = renderHook(() => usePowerSyncStatus());

    expect(result.current.connectionMethod).toBe('HTTP Streaming');
  });

  it('should poll status periodically', async () => {
    renderHook(() => usePowerSyncStatus());

    const initialCallCount = mockPowerSyncSystem.getStatus.mock.calls.length;

    // Advance timer by 2 seconds (polling interval)
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(mockPowerSyncSystem.getStatus.mock.calls.length).toBeGreaterThan(
        initialCallCount
      );
    });
  });

  it('should handle errors gracefully when getting status fails', () => {
    mockPowerSyncSystem.getStatus.mockImplementation(() => {
      throw new Error('Status check failed');
    });

    renderHook(() => usePowerSyncStatus());

    // Hook should handle error gracefully without crashing
    expect(mockPowerSyncSystem.getStatus).toHaveBeenCalled();
  });

  it('should cleanup subscriptions and intervals on unmount', () => {
    const { unmount } = renderHook(() => usePowerSyncStatus());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should combine system and connection manager status correctly', () => {
    mockPowerSyncSystem.getStatus.mockReturnValue({
      initialized: true,
      connected: true,
      connectionMethod: 'WebSocket',
      status: 'connected',
    });

    mockPowerSyncConnectionManager.getState.mockReturnValue({
      isInitialized: true,
      isConnected: false, // Connection manager says not connected
      isConnecting: false,
      lastConnectionAttempt: Date.now(),
      connectionError: null,
      hasAnonymousSession: false,
      hasAuthenticatedSession: true,
    });

    const { result } = renderHook(() => usePowerSyncStatus());

    // Should be false if either system says not connected
    expect(result.current.connected).toBe(false);
  });
});
