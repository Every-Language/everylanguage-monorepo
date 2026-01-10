import { renderHook, act } from '@testing-library/react-native';
import { useOptimisticNetwork } from '../useOptimisticNetwork';
import { useNetworkStore } from '@/shared/store/networkStore';
import { networkErrorClassifier } from '@/shared/services/network/NetworkErrorClassifier';

// Mock the network store
jest.mock('@/shared/store/networkStore');
jest.mock('@/shared/services/network/NetworkErrorClassifier', () => ({
  networkErrorClassifier: {
    isNetworkError: jest.fn(),
  },
}));

const mockUseNetworkStore = useNetworkStore as jest.MockedFunction<
  typeof useNetworkStore
>;

describe('useOptimisticNetwork', () => {
  beforeEach(() => {
    mockUseNetworkStore.mockReturnValue({
      capabilities: {
        isOnline: true,
        isChecking: false,
        lastChecked: Date.now(),
        error: null,
      },
      checkOnlineCapabilities: jest.fn().mockResolvedValue(true),
      clearError: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should execute action successfully when no error occurs', async () => {
    const { result } = renderHook(() => useOptimisticNetwork());

    const mockAction = jest.fn().mockResolvedValue('success');

    let actionResult;
    await act(async () => {
      actionResult = await result.current.executeWithNetworkCheck(mockAction);
    });

    expect(actionResult).toBe('success');
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should check connectivity when network error occurs', async () => {
    const mockCheckOnlineCapabilities = jest.fn().mockResolvedValue(false);
    mockUseNetworkStore.mockReturnValue({
      capabilities: {
        isOnline: true,
        isChecking: false,
        lastChecked: Date.now(),
        error: null,
      },
      checkOnlineCapabilities: mockCheckOnlineCapabilities,
      clearError: jest.fn(),
    });

    // Mock the network error classifier to return true for network errors
    (networkErrorClassifier.isNetworkError as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useOptimisticNetwork());

    const mockAction = jest
      .fn()
      .mockRejectedValue(new Error('Network request failed'));

    await act(async () => {
      try {
        await result.current.executeWithNetworkCheck(mockAction);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    expect(mockCheckOnlineCapabilities).toHaveBeenCalled();
  });

  it('should not retry non-network errors', async () => {
    // Mock the network error classifier to return false for non-network errors
    (networkErrorClassifier.isNetworkError as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useOptimisticNetwork());

    const mockAction = jest
      .fn()
      .mockRejectedValue(new Error('Validation failed'));

    await act(async () => {
      try {
        await result.current.executeWithNetworkCheck(mockAction);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should provide connectivity check function', async () => {
    const { result } = renderHook(() => useOptimisticNetwork());

    let isOnline;
    await act(async () => {
      isOnline = await result.current.checkConnectivity();
    });

    expect(isOnline).toBe(true);
  });
});
