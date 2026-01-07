import { supabase } from '@/shared/services/api/supabase';
import { networkService } from '@/shared/services/network/NetworkService';
import { logger } from '@/shared/utils/logger';
import { powerSyncSystem } from './PowerSyncSystem';
import type { ConnectionState, ConnectionConfig } from './types';

// Logging configuration for this module
const ENABLE_LOGGING = false;

/**
 * Manages PowerSync connection lifecycle following best practices:
 * 1. Separates database initialization from connection
 * 2. Uses existing NetworkService for robust connectivity checks
 * 3. Implements proper retry logic with exponential backoff
 * 4. Handles anonymous and authenticated session transitions
 */
export class PowerSyncConnectionManager {
  private static instance: PowerSyncConnectionManager;
  private state: ConnectionState = {
    isInitialized: false,
    isConnected: false,
    isConnecting: false,
    lastConnectionAttempt: null,
    connectionError: null,
    hasAnonymousSession: false,
    hasAuthenticatedSession: false,
  };

  private config: ConnectionConfig = {
    maxRetries: 5,
    retryDelayBase: 1000, // 1 second
    maxRetryDelay: 30000, // 30 seconds max
    connectionTimeout: 10000, // 10 seconds
    networkCheckInterval: 15000, // 15 seconds
  };

  private retryCount = 0;
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private networkCheckIntervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(state: ConnectionState) => void> = [];

  private constructor() {}

  public static getInstance(): PowerSyncConnectionManager {
    if (!PowerSyncConnectionManager.instance) {
      PowerSyncConnectionManager.instance = new PowerSyncConnectionManager();
    }
    return PowerSyncConnectionManager.instance;
  }

  /**
   * Initialize the connection manager
   * This should be called after database initialization
   */
  public async initialize(): Promise<void> {
    if (this.state.isInitialized) {
      logger.info(
        ENABLE_LOGGING,
        'PowerSyncConnectionManager: Already initialized'
      );
      return;
    }

    logger.info(ENABLE_LOGGING, 'PowerSyncConnectionManager: Initializing...');

    // Ensure PowerSync database is initialized first
    if (!powerSyncSystem.isInitialized) {
      throw new Error(
        'PowerSync database must be initialized before connection manager'
      );
    }

    this.state.isInitialized = true;
    this.updateState({ isInitialized: true });

    // Start attempting connection (non-blocking)
    this.startConnectionLoop();

    logger.info(
      ENABLE_LOGGING,
      'PowerSyncConnectionManager: Initialized successfully'
    );
  }

  /**
   * Start the connection loop that handles retries and network changes
   */
  private startConnectionLoop(): void {
    // Clear any existing intervals
    this.stopConnectionLoop();

    // Start periodic network checks when offline
    this.networkCheckIntervalId = setInterval(() => {
      if (!this.state.isConnected && !this.state.isConnecting) {
        this.attemptConnection();
      }
    }, this.config.networkCheckInterval);

    // Make initial connection attempt
    this.attemptConnection();
  }

  /**
   * Stop the connection loop
   */
  private stopConnectionLoop(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    if (this.networkCheckIntervalId) {
      clearInterval(this.networkCheckIntervalId);
      this.networkCheckIntervalId = null;
    }
  }

  /**
   * Attempt to establish PowerSync connection
   */
  public async attemptConnection(): Promise<boolean> {
    if (this.state.isConnecting || this.state.isConnected) {
      logger.debug(
        ENABLE_LOGGING,
        'PowerSyncConnectionManager: Connection attempt skipped (already connecting/connected)'
      );
      return this.state.isConnected;
    }

    this.updateState({
      isConnecting: true,
      lastConnectionAttempt: Date.now(),
      connectionError: null,
    });

    try {
      logger.info(
        ENABLE_LOGGING,
        `PowerSyncConnectionManager: Attempting connection (attempt ${this.retryCount + 1}/${this.config.maxRetries})`
      );

      // Step 1: Check network connectivity
      const hasNetwork = await this.checkNetworkConnectivity();
      if (!hasNetwork) {
        throw new Error('No network connectivity available');
      }

      // Step 2: Ensure we have an auth session (anonymous or authenticated)
      await this.ensureAuthSession();

      // Step 3: Connect PowerSync
      await this.connectPowerSync();

      // Success - reset retry count and update state
      this.retryCount = 0;
      this.updateState({
        isConnected: true,
        isConnecting: false,
        connectionError: null,
      });

      logger.info(
        ENABLE_LOGGING,
        'PowerSyncConnectionManager: Connected successfully'
      );
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.warn(
        ENABLE_LOGGING,
        `PowerSyncConnectionManager: Connection attempt failed: ${errorMessage}`
      );

      this.updateState({
        isConnecting: false,
        connectionError: errorMessage,
      });

      // Schedule retry if we haven't exceeded max retries
      this.scheduleRetry();
      return false;
    }
  }

  /**
   * Check network connectivity using the robust NetworkService
   */
  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      logger.debug(
        ENABLE_LOGGING,
        'PowerSyncConnectionManager: Checking network connectivity...'
      );

      // Use your existing NetworkService for robust connectivity checking
      const isOnline = await networkService.checkOnlineCapabilities();

      if (isOnline) {
        logger.debug(
          ENABLE_LOGGING,
          'PowerSyncConnectionManager: Network connectivity confirmed'
        );
      } else {
        logger.debug(
          ENABLE_LOGGING,
          'PowerSyncConnectionManager: No network connectivity'
        );
      }

      return isOnline;
    } catch (error) {
      logger.warn(
        ENABLE_LOGGING,
        'PowerSyncConnectionManager: Network check failed:',
        error
      );
      return false;
    }
  }

  /**
   * Ensure we have an authentication session (anonymous or authenticated)
   */
  private async ensureAuthSession(): Promise<void> {
    try {
      logger.debug(
        ENABLE_LOGGING,
        'PowerSyncConnectionManager: Checking auth session...'
      );

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw new Error(`Failed to get session: ${error.message}`);
      }

      if (session) {
        // We have a session - check if it's anonymous or authenticated
        const isAnonymous = session.user?.is_anonymous ?? false;

        this.updateState({
          hasAnonymousSession: isAnonymous,
          hasAuthenticatedSession: !isAnonymous,
        });

        logger.debug(
          ENABLE_LOGGING,
          `PowerSyncConnectionManager: Existing ${isAnonymous ? 'anonymous' : 'authenticated'} session found`
        );
        return;
      }

      // No session available: do not mutate auth; rely on authService to ensure session when online
      throw new Error('No Supabase session available');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Auth session setup failed: ${errorMessage}`);
    }
  }

  /**
   * Connect PowerSync with timeout
   */
  private async connectPowerSync(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `PowerSync connection timeout after ${this.config.connectionTimeout}ms`
          )
        );
      }, this.config.connectionTimeout);

      powerSyncSystem
        .connect()
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Schedule retry with exponential backoff
   */
  private scheduleRetry(): void {
    if (this.retryCount >= this.config.maxRetries) {
      logger.error(
        ENABLE_LOGGING,
        `PowerSyncConnectionManager: Max retries (${this.config.maxRetries}) exceeded`
      );
      return;
    }

    const delay = Math.min(
      this.config.retryDelayBase * Math.pow(2, this.retryCount),
      this.config.maxRetryDelay
    );

    this.retryCount++;

    logger.info(
      ENABLE_LOGGING,
      `PowerSyncConnectionManager: Scheduling retry ${this.retryCount} in ${delay}ms`
    );

    this.retryTimeoutId = setTimeout(() => {
      this.attemptConnection();
    }, delay);
  }

  /**
   * Handle user authentication (anonymous -> authenticated transition)
   */
  public async onUserAuthenticated(): Promise<void> {
    logger.info(
      ENABLE_LOGGING,
      'PowerSyncConnectionManager: User authenticated, refreshing connection...'
    );

    try {
      // Update session state
      this.updateState({
        hasAnonymousSession: false,
        hasAuthenticatedSession: true,
      });

      // If we're connected, disconnect and reconnect with new credentials
      if (this.state.isConnected) {
        logger.debug(
          ENABLE_LOGGING,
          'PowerSyncConnectionManager: Disconnecting to refresh with authenticated session...'
        );
        await powerSyncSystem.disconnect();
        this.updateState({ isConnected: false });
      }

      // Reset retry count for fresh connection attempt
      this.retryCount = 0;

      // Attempt new connection with authenticated session
      await this.attemptConnection();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        ENABLE_LOGGING,
        'PowerSyncConnectionManager: Failed to refresh connection after authentication:',
        errorMessage
      );

      this.updateState({ connectionError: errorMessage });
    }
  }

  /**
   * Handle user sign out
   */
  public async onUserSignedOut(): Promise<void> {
    logger.info(
      ENABLE_LOGGING,
      'PowerSyncConnectionManager: User signed out, switching to anonymous session...'
    );

    try {
      // Disconnect current session
      if (this.state.isConnected) {
        await powerSyncSystem.disconnect();
        this.updateState({ isConnected: false });
      }

      // Update session state
      this.updateState({
        hasAnonymousSession: false,
        hasAuthenticatedSession: false,
      });

      // Reset retry count
      this.retryCount = 0;

      // Attempt connection with new anonymous session
      await this.attemptConnection();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        ENABLE_LOGGING,
        'PowerSyncConnectionManager: Failed to establish anonymous session after sign out:',
        errorMessage
      );

      this.updateState({ connectionError: errorMessage });
    }
  }

  /**
   * Manually trigger connection attempt (useful for retry buttons)
   */
  public async forceReconnect(): Promise<boolean> {
    logger.info(
      ENABLE_LOGGING,
      'PowerSyncConnectionManager: Force reconnect requested'
    );

    // Reset state
    this.retryCount = 0;
    this.updateState({
      connectionError: null,
      isConnecting: false,
      isConnected: false,
    });

    // Clear any pending retries
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    return this.attemptConnection();
  }

  /**
   * Get current connection state
   */
  public getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Subscribe to connection state changes
   */
  public subscribe(listener: (state: ConnectionState) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Update connection configuration
   */
  public updateConfig(newConfig: Partial<ConnectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info(
      ENABLE_LOGGING,
      'PowerSyncConnectionManager: Configuration updated:',
      this.config
    );
  }

  /**
   * Cleanup when shutting down
   */
  public async shutdown(): Promise<void> {
    logger.info(ENABLE_LOGGING, 'PowerSyncConnectionManager: Shutting down...');

    this.stopConnectionLoop();

    if (this.state.isConnected) {
      await powerSyncSystem.disconnect();
    }

    this.updateState({
      isInitialized: false,
      isConnected: false,
      isConnecting: false,
    });

    this.listeners.length = 0;
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<ConnectionState>): void {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...updates };

    // Notify listeners if state actually changed
    if (JSON.stringify(previousState) !== JSON.stringify(this.state)) {
      this.listeners.forEach(listener => {
        try {
          listener(this.state);
        } catch (error) {
          logger.error(
            ENABLE_LOGGING,
            'PowerSyncConnectionManager: Listener error:',
            error
          );
        }
      });
    }
  }
}

// Export singleton instance
export const powerSyncConnectionManager =
  PowerSyncConnectionManager.getInstance();
