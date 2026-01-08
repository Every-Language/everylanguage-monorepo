import NetInfo from '@react-native-community/netinfo';
import { MaterialIcons } from '@expo/vector-icons';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

export interface NetworkState {
  isConnected: boolean;
  connectionType: string | null;
  isInternetReachable: boolean | null;
}

export interface NetworkStatusInfo {
  text: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}

export interface ConnectivityTestResult {
  isOnline: boolean;
  latency: number;
  endpoint: string;
  error?: string;
}

export interface ConnectivityConfig {
  timeout: number;
  retries: number;
  parallelRequests: number;
  successThreshold: number; // Number of successful requests needed
}

export class NetworkService {
  private static instance: NetworkService;
  private cache: Map<string, { data: boolean; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 60 seconds (reduce frequency of external checks)
  private readonly DEFAULT_TIMEOUT = 3000; // 3 seconds (reduced from 5s)
  private readonly MAX_RETRIES = 2;
  private readonly SUCCESS_THRESHOLD = 1; // At least 1 successful request

  // Tiered endpoints for better reliability
  private readonly ENDPOINTS = {
    // Tier 1: App-specific endpoints (most reliable)
    // app: [
    //   'https://api.supabase.co/health', // Your Supabase endpoint
    //   // Add your app's API health endpoints here
    // ],
    // Tier 2: Reliable public APIs (lightweight/no-body 204 where possible)
    reliable: [
      'https://www.gstatic.com/generate_204', // Tiny 204 used by Android captive portal checks
      'https://httpstat.us/204', // Minimal 204
      'https://httpbin.org/status/204', // 204 with no body
    ],
    // Tier 3: Fallback endpoints
    fallback: [
      'https://httpbin.org/get', // Simple JSON response
      'https://jsonplaceholder.typicode.com/posts/1', // Tiny JSON
      'https://www.cloudflare.com/cdn-cgi/trace', // CDN endpoint
    ],
  };

  static getInstance() {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  /**
   * Enhanced internet connectivity check with parallel requests and tiered endpoints
   */
  async checkOnlineCapabilities(): Promise<boolean> {
    // logger.info(ENABLE_LOGGING, //   'NetworkService: Starting enhanced online capabilities check...'
    // );

    // Check cache first
    const cacheKey = 'online-capabilities';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      // logger.info(ENABLE_LOGGING, //   'NetworkService: Using cached online capabilities result:', //   cached.data
      // );
      return cached.data;
    }

    // First check if we have basic network connectivity
    const networkState = await this.getNetworkState();
    // logger.info(ENABLE_LOGGING, 'NetworkService: Current network state:', networkState);

    // If NetInfo reports no connectivity, short-circuit without external pings
    if (
      !networkState.isConnected ||
      networkState.isInternetReachable === false
    ) {
      // logger.warn(ENABLE_LOGGING, 'NetworkService: No network connection detected');
      this.cache.set(cacheKey, { data: false, timestamp: Date.now() });
      return false;
    }

    // logger.info(ENABLE_LOGGING, //   'NetworkService: Network is connected, testing internet connectivity...'
    // );

    try {
      const config: ConnectivityConfig = {
        timeout: this.DEFAULT_TIMEOUT,
        retries: this.MAX_RETRIES,
        parallelRequests: 3,
        successThreshold: this.SUCCESS_THRESHOLD,
      };

      const result = await this.performConnectivityTest(config);

      // Cache the result
      this.cache.set(cacheKey, {
        data: result.isOnline,
        timestamp: Date.now(),
      });

      // logger.info(ENABLE_LOGGING, 'NetworkService: Enhanced connectivity check result:', {
      //   isOnline: result.isOnline,
      //   latency: result.latency,
      //   endpoint: result.endpoint,
      //   error: result.error,
      // });

      return result.isOnline;
    } catch (error) {
      logger.error(
        true,
        'NetworkService: Enhanced connectivity check failed:',
        error
      );
      this.cache.set(cacheKey, { data: false, timestamp: Date.now() });
      return false;
    }
  }

  /**
   * Perform connectivity test with parallel requests and tiered endpoints
   */
  private async performConnectivityTest(
    config: ConnectivityConfig
  ): Promise<ConnectivityTestResult> {
    const startTime = Date.now();
    let successfulRequests = 0;
    let bestResult: ConnectivityTestResult | null = null;

    // logger.info(ENABLE_LOGGING, //   'NetworkService: Starting connectivity test with config:', //   config
    // );

    // Test endpoints in tiers (app-specific first, then reliable, then fallback)
    for (const [, endpoints] of Object.entries(this.ENDPOINTS)) {
      // logger.info(ENABLE_LOGGING, //   `NetworkService: Testing ${tierName} tier endpoints:`, //   endpoints
      // );

      // Test endpoints in parallel within each tier
      const tierPromises = endpoints.map(endpoint =>
        this.testEndpoint(endpoint, config.timeout, config.retries)
      );

      try {
        const results = await Promise.allSettled(tierPromises);

        // Process results
        for (let i = 0; i < results.length; i++) {
          const result = results[i];

          if (
            result &&
            result.status === 'fulfilled' &&
            result.value.isOnline
          ) {
            successfulRequests++;
            // logger.info(ENABLE_LOGGING, //   `NetworkService: Endpoint ${endpoint} succeeded (${result.value.latency}ms)`
            // );

            // Track the fastest successful result
            if (!bestResult || result.value.latency < bestResult.latency) {
              bestResult = result.value;
            }

            // If we have enough successful requests, return early
            if (successfulRequests >= config.successThreshold && bestResult) {
              // logger.info(ENABLE_LOGGING, //   `NetworkService: Sufficient successful requests (${successfulRequests}) from ${tierName} tier`
              // );
              return bestResult;
            }
          } else if (result) {
            // derive failure message but do not use to satisfy linter
            void (result.status === 'rejected'
              ? result.reason
              : result.status === 'fulfilled'
                ? result.value.error || 'Unknown error'
                : 'Unknown error');
            // logger.warn(ENABLE_LOGGING, //   `NetworkService: Endpoint failed:`, //   '(message hidden)'
            // );
          }
        }
      } catch {
        // logger.warn(ENABLE_LOGGING, `NetworkService: Tier ${tierName} failed:`, error);
      }
    }

    // If we get here, we didn't meet the success threshold
    logger.error(
      true,
      `NetworkService: Insufficient successful requests (${successfulRequests}/${config.successThreshold})`
    );
    return {
      isOnline: false,
      latency: Date.now() - startTime,
      endpoint: 'none',
      error: `Insufficient successful connectivity tests (${successfulRequests}/${config.successThreshold})`,
    };
  }

  /**
   * Test a single endpoint with retries
   */
  private async testEndpoint(
    endpoint: string,
    timeout: number,
    retries: number
  ): Promise<ConnectivityTestResult> {
    const startTime = Date.now();

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // logger.info(ENABLE_LOGGING, //   `NetworkService: Testing endpoint ${endpoint} (attempt ${attempt + 1}/${retries + 1})`
        // );

        const response = await this.makeRequest(endpoint, timeout);
        const latency = Date.now() - startTime;

        if (response.ok) {
          // logger.info(ENABLE_LOGGING, //   `NetworkService: Endpoint ${endpoint} successful (${latency}ms)`
          // );
          return {
            isOnline: true,
            latency,
            endpoint,
          };
        } else {
          logger.warn(
            true,
            `NetworkService: Endpoint ${endpoint} returned status ${response.status}`
          );
        }
      } catch (error) {
        // logger.warn(ENABLE_LOGGING, //   `NetworkService: Endpoint ${endpoint} attempt ${attempt + 1} failed:`, //   error
        // );

        // Don't retry on the last attempt
        if (attempt === retries) {
          return {
            isOnline: false,
            latency: Date.now() - startTime,
            endpoint,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }

        // Wait before retry (exponential backoff)
        await this.delay(Math.pow(2, attempt) * 100);
      }
    }

    return {
      isOnline: false,
      latency: Date.now() - startTime,
      endpoint,
      error: 'Max retries exceeded',
    };
  }

  /**
   * Make a single HTTP request with timeout
   */
  private async makeRequest(
    endpoint: string,
    timeout: number
  ): Promise<globalThis.Response> {
    const controller = new globalThis.AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'BibleApp/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current network state
   */
  async getNetworkState(): Promise<NetworkState> {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected ?? false,
      connectionType: state.type,
      isInternetReachable: state.isInternetReachable,
    };
  }

  /**
   * Clear cache for online capabilities check
   */
  clearCache(): void {
    this.cache.clear();
    logger.info(ENABLE_LOGGING, 'NetworkService: Cache cleared');
  }

  /**
   * Get network status information for UI display
   */
  getNetworkStatusInfo(
    networkState: NetworkState,
    theme: { colors: { error: string; success: string; textSecondary: string } }
  ): NetworkStatusInfo {
    const { isConnected, connectionType, isInternetReachable } = networkState;

    if (!isConnected) {
      return {
        text: 'No network connection',
        icon: 'cloud-off',
        color: theme.colors.error,
      };
    }

    if (isInternetReachable === false) {
      return {
        text: 'No internet access',
        icon: 'wifi-off',
        color: theme.colors.error,
      };
    }

    switch (connectionType) {
      case 'wifi':
        return {
          text: 'WiFi connected',
          icon: 'wifi',
          color: theme.colors.success,
        };
      case 'cellular':
        return {
          text: 'Mobile data connected',
          icon: 'signal-cellular-4-bar',
          color: theme.colors.success,
        };
      case 'bluetooth':
        return {
          text: 'Bluetooth connected',
          icon: 'bluetooth',
          color: theme.colors.success,
        };
      case 'ethernet':
        return {
          text: 'Ethernet connected',
          icon: 'cable',
          color: theme.colors.success,
        };
      default:
        return {
          text: 'Network connected',
          icon: 'language',
          color: theme.colors.success,
        };
    }
  }

  /**
   * Check if network is available for downloads
   */
  isNetworkAvailableForDownloads(networkState: NetworkState): boolean {
    return (
      networkState.isConnected && networkState.isInternetReachable === true
    );
  }

  /**
   * Get network status text for display
   */
  getNetworkStatusText(networkState: NetworkState): string {
    const { isConnected, connectionType, isInternetReachable } = networkState;

    if (!isConnected) {
      return 'No network connection';
    }

    if (isInternetReachable === false) {
      return 'No internet access';
    }

    switch (connectionType) {
      case 'wifi':
        return 'WiFi connected';
      case 'cellular':
        return 'Mobile data connected';
      case 'bluetooth':
        return 'Bluetooth connected';
      case 'ethernet':
        return 'Ethernet connected';
      default:
        return 'Network connected';
    }
  }

  /**
   * Get network icon for display
   */
  getNetworkIcon(
    networkState: NetworkState
  ): keyof typeof MaterialIcons.glyphMap {
    const { isConnected, connectionType, isInternetReachable } = networkState;

    if (!isConnected) return 'cloud-off';
    if (isInternetReachable === false) return 'wifi-off';

    switch (connectionType) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'signal-cellular-4-bar';
      case 'bluetooth':
        return 'bluetooth';
      case 'ethernet':
        return 'cable';
      default:
        return 'language';
    }
  }

  /**
   * Get network status color for display
   */
  getNetworkStatusColor(
    networkState: NetworkState,
    theme: { colors: { error: string; success: string } }
  ): string {
    const { isConnected, isInternetReachable } = networkState;

    if (!isConnected || isInternetReachable === false) {
      return theme.colors.error;
    }
    return theme.colors.success;
  }

  /**
   * Subscribe to network state changes
   */
  subscribeToNetworkChanges(callback: (state: NetworkState) => void) {
    return NetInfo.addEventListener(state => {
      const networkState: NetworkState = {
        isConnected: state.isConnected ?? false,
        connectionType: state.type,
        isInternetReachable: state.isInternetReachable,
      };
      callback(networkState);
    });
  }

  /**
   * Debug method to test network connectivity with detailed logging
   */
  async debugNetworkConnectivity(): Promise<void> {
    // logger.info(ENABLE_LOGGING, 'NetworkService: Starting debug network connectivity test...');

    try {
      // Check basic network state
      const networkState = await this.getNetworkState();
      // logger.info(ENABLE_LOGGING, 'NetworkService: Debug - Network state:', networkState);

      // Check if NetInfo reports internet reachability
      if (networkState.isInternetReachable === false) {
        logger.warn(
          true,
          'NetworkService: Debug - NetInfo reports no internet reachability'
        );
      } else if (networkState.isInternetReachable === true) {
        // logger.info(ENABLE_LOGGING, //   'NetworkService: Debug - NetInfo reports internet is reachable'
        // );
      } else {
        // logger.info(ENABLE_LOGGING, //   'NetworkService: Debug - NetInfo reports unknown internet reachability'
        // );
      }

      // Test actual connectivity
      const isOnline = await this.checkOnlineCapabilities();
      logger.info(
        true,
        'NetworkService: Debug - Online capabilities check result:',
        isOnline
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'NetworkService: Debug - Error during network test:',
        {
          error: error,
          errorMessage: (error as Error)?.message || 'No message',
        }
      );
    }
  }

  /**
   * Public method to test a single endpoint (for debugging)
   */
  async testSingleEndpoint(endpoint: string): Promise<ConnectivityTestResult> {
    // logger.info(ENABLE_LOGGING, `NetworkService: Testing single endpoint: ${endpoint}`);
    return this.testEndpoint(endpoint, this.DEFAULT_TIMEOUT, this.MAX_RETRIES);
  }
}

// Export singleton instance
export const networkService = NetworkService.getInstance();

// Export error classifier
export { networkErrorClassifier } from './NetworkErrorClassifier';
