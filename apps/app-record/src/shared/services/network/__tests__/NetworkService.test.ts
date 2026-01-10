import { NetworkService } from '../NetworkService';
import NetInfo from '@react-native-community/netinfo';

// Mock external dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('@/shared/utils/logger');

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('NetworkService', () => {
  let networkService: NetworkService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (NetworkService as any).instance = undefined;
    networkService = NetworkService.getInstance();

    // Clear any existing cache
    networkService.clearCache();

    // Reset fetch mock
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = NetworkService.getInstance();
      const instance2 = NetworkService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(NetworkService);
    });
  });

  describe('getNetworkState', () => {
    it('should return network state from NetInfo', async () => {
      const mockState = {
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockNetInfo.fetch.mockResolvedValue(mockState as any);

      const result = await networkService.getNetworkState();

      expect(mockNetInfo.fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        isConnected: true,
        connectionType: 'wifi',
        isInternetReachable: true,
      });
    });

    it('should handle null values from NetInfo', async () => {
      const mockState = {
        isConnected: null,
        type: null,
        isInternetReachable: null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockNetInfo.fetch.mockResolvedValue(mockState as any);

      const result = await networkService.getNetworkState();

      expect(result).toEqual({
        isConnected: false,
        connectionType: null,
        isInternetReachable: null,
      });
    });
  });

  describe('checkOnlineCapabilities', () => {
    beforeEach(() => {
      // Mock successful network state
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    });

    it('should return cached result if available', async () => {
      // First call to populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      } as globalThis.Response);

      const result1 = await networkService.checkOnlineCapabilities();
      expect(result1).toBe(true);
      const firstCallCount = mockFetch.mock.calls.length;

      // Second call should use cache
      const result2 = await networkService.checkOnlineCapabilities();
      expect(result2).toBe(true);

      // Should not make additional fetch calls
      expect(mockFetch.mock.calls.length).toBe(firstCallCount);
    });

    it('should return false when not connected', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        type: null,
        isInternetReachable: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await networkService.checkOnlineCapabilities();

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return false when internet is not reachable', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await networkService.checkOnlineCapabilities();

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should test connectivity with tiered endpoints', async () => {
      // Mock successful response from reliable tier
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      } as globalThis.Response);

      const result = await networkService.checkOnlineCapabilities();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.gstatic.com/generate_204',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'User-Agent': 'BibleApp/1.0',
          }),
        })
      );
    });

    it('should fallback to other tiers if first tier fails', async () => {
      // Mock failures for reliable tier
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        // Mock success for fallback tier
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as globalThis.Response);

      const result = await networkService.checkOnlineCapabilities();

      expect(result).toBe(true);
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(4); // 3 failed + 1 success
    });

    it('should return false if all endpoints fail', async () => {
      // Mock all endpoints to fail
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await networkService.checkOnlineCapabilities();

      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle timeout correctly', async () => {
      // Mock a timeout response that rejects immediately
      mockFetch.mockRejectedValue(new Error('Request timeout'));

      const result = await networkService.checkOnlineCapabilities();
      expect(result).toBe(false);
    });

    it('should retry failed requests', async () => {
      // Mock first attempt to fail, second to succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
        } as globalThis.Response);

      const result = await networkService.checkOnlineCapabilities();

      expect(result).toBe(true);
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getNetworkStatusInfo', () => {
    const mockTheme = {
      colors: {
        error: '#ff0000',
        success: '#00ff00',
        textSecondary: '#666666',
      },
    };

    it('should return disconnected status', () => {
      const networkState = {
        isConnected: false,
        connectionType: null,
        isInternetReachable: null,
      };

      const result = networkService.getNetworkStatusInfo(
        networkState,
        mockTheme
      );

      expect(result).toEqual({
        text: 'No network connection',
        icon: 'cloud-off',
        color: '#ff0000',
      });
    });

    it('should return no internet status', () => {
      const networkState = {
        isConnected: true,
        connectionType: 'wifi',
        isInternetReachable: false,
      };

      const result = networkService.getNetworkStatusInfo(
        networkState,
        mockTheme
      );

      expect(result).toEqual({
        text: 'No internet access',
        icon: 'wifi-off',
        color: '#ff0000',
      });
    });

    it('should return WiFi status', () => {
      const networkState = {
        isConnected: true,
        connectionType: 'wifi',
        isInternetReachable: true,
      };

      const result = networkService.getNetworkStatusInfo(
        networkState,
        mockTheme
      );

      expect(result).toEqual({
        text: 'WiFi connected',
        icon: 'wifi',
        color: '#00ff00',
      });
    });

    it('should return cellular status', () => {
      const networkState = {
        isConnected: true,
        connectionType: 'cellular',
        isInternetReachable: true,
      };

      const result = networkService.getNetworkStatusInfo(
        networkState,
        mockTheme
      );

      expect(result).toEqual({
        text: 'Mobile data connected',
        icon: 'signal-cellular-4-bar',
        color: '#00ff00',
      });
    });

    it('should return bluetooth status', () => {
      const networkState = {
        isConnected: true,
        connectionType: 'bluetooth',
        isInternetReachable: true,
      };

      const result = networkService.getNetworkStatusInfo(
        networkState,
        mockTheme
      );

      expect(result).toEqual({
        text: 'Bluetooth connected',
        icon: 'bluetooth',
        color: '#00ff00',
      });
    });

    it('should return ethernet status', () => {
      const networkState = {
        isConnected: true,
        connectionType: 'ethernet',
        isInternetReachable: true,
      };

      const result = networkService.getNetworkStatusInfo(
        networkState,
        mockTheme
      );

      expect(result).toEqual({
        text: 'Ethernet connected',
        icon: 'cable',
        color: '#00ff00',
      });
    });

    it('should return default status for unknown connection type', () => {
      const networkState = {
        isConnected: true,
        connectionType: 'unknown',
        isInternetReachable: true,
      };

      const result = networkService.getNetworkStatusInfo(
        networkState,
        mockTheme
      );

      expect(result).toEqual({
        text: 'Network connected',
        icon: 'language',
        color: '#00ff00',
      });
    });
  });

  describe('getNetworkStatusText', () => {
    it('should return appropriate text for different states', () => {
      expect(
        networkService.getNetworkStatusText({
          isConnected: false,
          connectionType: null,
          isInternetReachable: null,
        })
      ).toBe('No network connection');

      expect(
        networkService.getNetworkStatusText({
          isConnected: true,
          connectionType: 'wifi',
          isInternetReachable: false,
        })
      ).toBe('No internet access');

      expect(
        networkService.getNetworkStatusText({
          isConnected: true,
          connectionType: 'wifi',
          isInternetReachable: true,
        })
      ).toBe('WiFi connected');
    });
  });

  describe('getNetworkIcon', () => {
    it('should return appropriate icons for different states', () => {
      expect(
        networkService.getNetworkIcon({
          isConnected: false,
          connectionType: null,
          isInternetReachable: null,
        })
      ).toBe('cloud-off');

      expect(
        networkService.getNetworkIcon({
          isConnected: true,
          connectionType: 'wifi',
          isInternetReachable: true,
        })
      ).toBe('wifi');

      expect(
        networkService.getNetworkIcon({
          isConnected: true,
          connectionType: 'cellular',
          isInternetReachable: true,
        })
      ).toBe('signal-cellular-4-bar');
    });
  });

  describe('getNetworkStatusColor', () => {
    const mockTheme = {
      colors: {
        error: '#ff0000',
        success: '#00ff00',
      },
    };

    it('should return error color for disconnected states', () => {
      expect(
        networkService.getNetworkStatusColor(
          {
            isConnected: false,
            connectionType: null,
            isInternetReachable: null,
          },
          mockTheme
        )
      ).toBe('#ff0000');

      expect(
        networkService.getNetworkStatusColor(
          {
            isConnected: true,
            connectionType: 'wifi',
            isInternetReachable: false,
          },
          mockTheme
        )
      ).toBe('#ff0000');
    });

    it('should return success color for connected states', () => {
      expect(
        networkService.getNetworkStatusColor(
          {
            isConnected: true,
            connectionType: 'wifi',
            isInternetReachable: true,
          },
          mockTheme
        )
      ).toBe('#00ff00');
    });
  });

  describe('isNetworkAvailableForDownloads', () => {
    it('should return true when network is available', () => {
      expect(
        networkService.isNetworkAvailableForDownloads({
          isConnected: true,
          connectionType: 'wifi',
          isInternetReachable: true,
        })
      ).toBe(true);
    });

    it('should return false when not connected', () => {
      expect(
        networkService.isNetworkAvailableForDownloads({
          isConnected: false,
          connectionType: null,
          isInternetReachable: null,
        })
      ).toBe(false);
    });

    it('should return false when internet is not reachable', () => {
      expect(
        networkService.isNetworkAvailableForDownloads({
          isConnected: true,
          connectionType: 'wifi',
          isInternetReachable: false,
        })
      ).toBe(false);
    });
  });

  describe('subscribeToNetworkChanges', () => {
    it('should subscribe to network changes and return unsubscribe function', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      mockNetInfo.addEventListener.mockReturnValue(mockUnsubscribe);

      const unsubscribe =
        networkService.subscribeToNetworkChanges(mockCallback);

      expect(mockNetInfo.addEventListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should transform NetInfo state to NetworkState format', () => {
      const mockCallback = jest.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let listenerCallback: (state: any) => void;

      mockNetInfo.addEventListener.mockImplementation(
        //  eslint-disable-next-line @typescript-eslint/no-explicit-any
        (callback: (state: any) => void) => {
          listenerCallback = callback;
          return jest.fn();
        }
      );

      networkService.subscribeToNetworkChanges(mockCallback);

      // Simulate NetInfo state change
      listenerCallback!({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
      });

      expect(mockCallback).toHaveBeenCalledWith({
        isConnected: true,
        connectionType: 'wifi',
        isInternetReachable: true,
      });
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      // Populate cache
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
      } as globalThis.Response);

      await networkService.checkOnlineCapabilities();
      const firstCallCount = mockFetch.mock.calls.length;

      // Clear cache
      networkService.clearCache();

      // Next call should make new request
      await networkService.checkOnlineCapabilities();
      const secondCallCount = mockFetch.mock.calls.length;

      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });
  });

  describe('debugNetworkConnectivity', () => {
    it('should perform debug network test', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
      } as globalThis.Response);

      await networkService.debugNetworkConnectivity();

      expect(mockNetInfo.fetch).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('testSingleEndpoint', () => {
    it('should test a single endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
      } as globalThis.Response);

      const result = await networkService.testSingleEndpoint(
        'https://example.com'
      );

      expect(result).toEqual({
        isOnline: true,
        latency: expect.any(Number),
        endpoint: 'https://example.com',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle endpoint test failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await networkService.testSingleEndpoint(
        'https://example.com'
      );

      expect(result).toEqual({
        isOnline: false,
        latency: expect.any(Number),
        endpoint: 'https://example.com',
        error: 'Network error',
      });
    }, 10000);
  });
});
