import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  networkService,
  NetworkState,
} from '../services/network/NetworkService';
import { logger } from '../utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

// Types
export interface NetworkCapabilities {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: number | null;
  error: string | null;
}

export interface NetworkStore {
  // Network state from NetInfo
  networkState: NetworkState;

  // Enhanced capabilities from active testing
  capabilities: NetworkCapabilities;

  // Internal state
  isInitialized: boolean;

  // Actions
  setNetworkState: (state: NetworkState) => void;
  setCapabilities: (capabilities: Partial<NetworkCapabilities>) => void;
  checkOnlineCapabilities: () => Promise<boolean>;
  retryOnlineCheck: () => Promise<boolean>;
  clearError: () => void;

  // Internal initialization
  _initialize: () => void;

  // Public initialization
  initialize: () => Promise<void>;
}

// Store
export const useNetworkStore = create<NetworkStore>()(
  persist(
    (set, get) => ({
      // Initial state - OPTIMISTIC: assume connected until proven otherwise
      networkState: {
        isConnected: true, // Optimistic: assume connected
        connectionType: null,
        isInternetReachable: null,
      },
      capabilities: {
        isOnline: true, // Optimistic: assume online
        isChecking: false,
        lastChecked: null,
        error: null,
      },
      isInitialized: false,

      // Actions
      setNetworkState: (state: NetworkState) => {
        // logger.info(ENABLE_LOGGING, 'NetworkStore: Setting network state:', state);
        set({ networkState: state });

        // Auto-check capabilities when network becomes available
        const { capabilities } = get();
        if (
          state.isConnected &&
          state.isInternetReachable !== false && // Allow null/true values
          !capabilities.isOnline &&
          !capabilities.isChecking
        ) {
          // logger.info(ENABLE_LOGGING, //   'NetworkStore: Network available, checking capabilities...'
          // );
          get().checkOnlineCapabilities();
        }
      },

      setCapabilities: (capabilities: Partial<NetworkCapabilities>) => {
        set(state => ({
          capabilities: { ...state.capabilities, ...capabilities },
        }));
      },

      checkOnlineCapabilities: async () => {
        const { capabilities } = get();

        // Don't check if already checking
        if (capabilities.isChecking) {
          return capabilities.isOnline;
        }

        set(state => ({
          capabilities: {
            ...state.capabilities,
            isChecking: true,
            error: null,
          },
        }));

        // logger.info(ENABLE_LOGGING, 'NetworkStore: Starting online capabilities check...');

        try {
          const isOnline = await networkService.checkOnlineCapabilities();

          set(state => ({
            capabilities: {
              ...state.capabilities,
              isOnline,
              isChecking: false,
              lastChecked: Date.now(),
              error: null,
            },
          }));

          // logger.info(ENABLE_LOGGING, //   'NetworkStore: Online capabilities check result:', //   isOnline
          // );
          return isOnline;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          set(state => ({
            capabilities: {
              ...state.capabilities,
              isOnline: false,
              isChecking: false,
              lastChecked: Date.now(),
              error: errorMessage,
            },
          }));

          logger.error(
            ENABLE_LOGGING,
            'NetworkStore: Online capabilities check failed:',
            error
          );
          return false;
        }
      },

      retryOnlineCheck: async () => {
        // logger.info(ENABLE_LOGGING, 'NetworkStore: Retrying online capabilities check...');
        // Clear cache before retrying
        networkService.clearCache();
        return get().checkOnlineCapabilities();
      },

      clearError: () => {
        set(state => ({
          capabilities: {
            ...state.capabilities,
            error: null,
          },
        }));
      },

      // Public initialization method
      initialize: async () => {
        const { isInitialized } = get();

        if (isInitialized) {
          // logger.info(ENABLE_LOGGING, 'NetworkStore: Already initialized');
          return;
        }

        // logger.info(ENABLE_LOGGING, 'NetworkStore: Starting explicit initialization...');

        // Call internal initialization
        get()._initialize();

        // Wait a bit for network state to be set
        await new Promise(resolve => setTimeout(resolve, 100));

        // Trigger initial capabilities check
        const { networkState } = get();
        if (
          networkState.isConnected &&
          networkState.isInternetReachable !== false
        ) {
          // logger.info(ENABLE_LOGGING, //   'NetworkStore: Triggering initial capabilities check during initialization...'
          // );
          await get().checkOnlineCapabilities();
        }

        // logger.info(ENABLE_LOGGING, 'NetworkStore: Initialization completed');
      },

      // Internal initialization - called automatically
      _initialize: () => {
        const { isInitialized } = get();

        // Only initialize once
        if (isInitialized) {
          return;
        }

        // logger.info(ENABLE_LOGGING, 'NetworkStore: Auto-initializing network monitoring...');

        // Get initial network state
        networkService.getNetworkState().then((state: NetworkState) => {
          // logger.info(ENABLE_LOGGING, 'NetworkStore: Initial network state:', state);
          set({ networkState: state });

          // Trigger initial capabilities check if network is available
          if (state.isConnected && state.isInternetReachable !== false) {
            // logger.info(ENABLE_LOGGING, //   'NetworkStore: Triggering initial capabilities check...'
            // );
            get().checkOnlineCapabilities();
          }
        });

        // Subscribe to network changes
        networkService.subscribeToNetworkChanges((state: NetworkState) => {
          // logger.info(ENABLE_LOGGING, 'NetworkStore: Network state changed:', state);
          set({ networkState: state });
        });

        set({ isInitialized: true });
      },
    }),
    {
      name: 'network-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential state
      partialize: state => ({
        networkState: state.networkState,
        capabilities: {
          isOnline: state.capabilities.isOnline,
          lastChecked: state.capabilities.lastChecked,
        },
      }),
    }
  )
);

// Auto-initialize when store is first accessed
let isInitialized = false;
const originalGetState = useNetworkStore.getState;

useNetworkStore.getState = () => {
  const state = originalGetState();

  if (!isInitialized) {
    isInitialized = true;
    state._initialize();
  }

  return state;
};
