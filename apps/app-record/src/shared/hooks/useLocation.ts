import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import {
  locationService,
  LocationData,
  LocationPermissionStatus,
  LocationServiceState,
} from '@/shared/services/location/LocationService';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export interface UseLocationReturn {
  // State
  location: LocationData | null;
  permissionStatus: LocationPermissionStatus;
  isEnabled: boolean;
  isGettingLocation: boolean;
  error: string | null;

  // Actions
  requestPermissions: () => Promise<LocationPermissionStatus>;
  getCurrentLocation: () => Promise<LocationData | null>;
  getApproximateLocation: () => Promise<LocationData | null>;
  getPreciseLocation: () => Promise<LocationData | null>;
  startLocationUpdates: (
    callback?: (location: LocationData) => void
  ) => Promise<boolean>;
  stopLocationUpdates: () => Promise<void>;

  // Utilities
  calculateDistance: (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => number;
  isLocationWithinRadius: (
    centerLat: number,
    centerLon: number,
    radiusMeters: number
  ) => boolean;
}

export interface UseLocationOptions {
  autoRequestPermissions?: boolean;
  autoGetLocation?: boolean;
  watchLocation?: boolean;
  accuracy?: 'low' | 'balanced' | 'high';
  updateInterval?: number; // milliseconds
}

export const useLocation = (
  options: UseLocationOptions = {}
): UseLocationReturn => {
  const {
    autoRequestPermissions = false,
    autoGetLocation = false,
    watchLocation = false,
    accuracy = 'balanced',
    updateInterval = 30000,
  } = options;

  const [state, setState] = useState<LocationServiceState>({
    isEnabled: false,
    permissionStatus: {
      granted: false,
      canAskAgain: true,
      status: 'undetermined' as LocationPermissionStatus['status'],
    },
    lastKnownLocation: null,
    isGettingLocation: false,
    error: null,
  });

  const [location, setLocation] = useState<LocationData | null>(null);
  // Note: isInitialized state is not currently used but kept for future use
  // const [isInitialized, setIsInitialized] = useState(false);
  const locationCallbackRef = useRef<((location: LocationData) => void) | null>(
    null
  );

  // Initialize location service
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        await locationService.initialize();
        const serviceState = locationService.getState();
        setState(serviceState);
        setLocation(serviceState.lastKnownLocation);

        // Auto-request permissions if enabled
        if (autoRequestPermissions && !serviceState.permissionStatus.granted) {
          await requestPermissions();
        }

        // Auto-get location if enabled
        if (autoGetLocation && serviceState.permissionStatus.granted) {
          await getCurrentLocation();
        }

        // Auto-start watching if enabled
        if (watchLocation && serviceState.permissionStatus.granted) {
          await startLocationUpdates();
        }
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          'Failed to initialize location hook:',
          error
        );
      }
    };

    initializeLocation();

    // Cleanup on unmount
    return () => {
      locationService.stopLocationUpdates().catch(error => {
        logger.error(
          ENABLE_LOGGING,
          'Failed to stop location updates on cleanup:',
          error
        );
      });
    };
  }, [autoRequestPermissions, autoGetLocation, watchLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Request location permissions
  const requestPermissions =
    useCallback(async (): Promise<LocationPermissionStatus> => {
      try {
        const permissionStatus = await locationService.requestPermissions();
        setState(prev => ({
          ...prev,
          permissionStatus,
          error: null,
        }));
        return permissionStatus;
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          'Failed to request location permissions:',
          error
        );
        return state.permissionStatus;
      }
    }, [state.permissionStatus]);

  // Get current location
  const getCurrentLocation =
    useCallback(async (): Promise<LocationData | null> => {
      try {
        const locationData = await locationService.getCurrentLocation();
        if (locationData) {
          setLocation(locationData);
          setState(prev => ({
            ...prev,
            lastKnownLocation: locationData,
            error: null,
          }));
        }
        return locationData;
      } catch (error) {
        logger.error(ENABLE_LOGGING, 'Failed to get current location:', error);
        return null;
      }
    }, []);

  // Get approximate location (faster, less accurate)
  const getApproximateLocation =
    useCallback(async (): Promise<LocationData | null> => {
      try {
        const locationData = await locationService.getApproximateLocation();
        if (locationData) {
          setLocation(locationData);
          setState(prev => ({
            ...prev,
            lastKnownLocation: locationData,
            error: null,
          }));
        }
        return locationData;
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          'Failed to get approximate location:',
          error
        );
        return null;
      }
    }, []);

  // Get precise location (slower, more accurate)
  const getPreciseLocation =
    useCallback(async (): Promise<LocationData | null> => {
      try {
        const locationData = await locationService.getPreciseLocation();
        if (locationData) {
          setLocation(locationData);
          setState(prev => ({
            ...prev,
            lastKnownLocation: locationData,
            error: null,
          }));
        }
        return locationData;
      } catch (error) {
        logger.error(ENABLE_LOGGING, 'Failed to get precise location:', error);
        return null;
      }
    }, []);

  // Start location updates
  const startLocationUpdates = useCallback(
    async (callback?: (location: LocationData) => void): Promise<boolean> => {
      try {
        if (callback) {
          locationCallbackRef.current = callback;
        }

        const success = await locationService.startLocationUpdates(
          {
            accuracy:
              accuracy === 'high'
                ? Location.Accuracy.High
                : accuracy === 'low'
                  ? Location.Accuracy.Low
                  : Location.Accuracy.Balanced,
            timeInterval: updateInterval,
          },
          locationData => {
            setLocation(locationData);
            setState(prev => ({
              ...prev,
              lastKnownLocation: locationData,
              error: null,
            }));
            locationCallbackRef.current?.(locationData);
          }
        );

        return success;
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          'Failed to start location updates:',
          error
        );
        return false;
      }
    },
    [accuracy, updateInterval]
  );

  // Stop location updates
  const stopLocationUpdates = useCallback(async (): Promise<void> => {
    try {
      await locationService.stopLocationUpdates();
      locationCallbackRef.current = null;
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Failed to stop location updates:', error);
    }
  }, []);

  // Calculate distance between two points
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      return locationService.calculateDistance(lat1, lon1, lat2, lon2);
    },
    []
  );

  // Check if location is within radius
  const isLocationWithinRadius = useCallback(
    (centerLat: number, centerLon: number, radiusMeters: number): boolean => {
      return locationService.isLocationWithinRadius(
        centerLat,
        centerLon,
        radiusMeters,
        location
      );
    },
    [location]
  );

  return {
    // State
    location,
    permissionStatus: state.permissionStatus,
    isEnabled: state.isEnabled,
    isGettingLocation: state.isGettingLocation,
    error: state.error,

    // Actions
    requestPermissions,
    getCurrentLocation,
    getApproximateLocation,
    getPreciseLocation,
    startLocationUpdates,
    stopLocationUpdates,

    // Utilities
    calculateDistance,
    isLocationWithinRadius,
  };
};
