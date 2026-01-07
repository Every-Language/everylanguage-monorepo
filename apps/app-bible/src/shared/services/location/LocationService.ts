import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Location.PermissionStatus;
}

export interface LocationServiceState {
  isEnabled: boolean;
  permissionStatus: LocationPermissionStatus;
  lastKnownLocation: LocationData | null;
  isGettingLocation: boolean;
  error: string | null;
}

export class LocationService {
  private static instance: LocationService;
  private state: LocationServiceState = {
    isEnabled: false,
    permissionStatus: {
      granted: false,
      canAskAgain: true,
      status: Location.PermissionStatus.UNDETERMINED,
    },
    lastKnownLocation: null,
    isGettingLocation: false,
    error: null,
  };
  private locationSubscription: Location.LocationSubscription | null = null;
  private isInitialized = false;
  private static readonly STORAGE_KEY_LAST_LOCATION = 'location:lastKnown';

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Initialize the location service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      logger.info(ENABLE_LOGGING, 'Initializing location service');

      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      this.state.isEnabled = isEnabled;

      if (!isEnabled) {
        logger.warn(
          ENABLE_LOGGING,
          'Location services are disabled on this device'
        );
        this.state.error = 'Location services are disabled';
        return;
      }

      // Check current permission status
      await this.checkPermissionStatus();

      // Hydrate last known location from persistent storage to speed up first access
      try {
        const stored = await AsyncStorage.getItem(
          LocationService.STORAGE_KEY_LAST_LOCATION
        );
        if (stored) {
          const parsed = JSON.parse(stored) as LocationData;
          if (
            typeof parsed?.latitude === 'number' &&
            typeof parsed?.longitude === 'number'
          ) {
            this.state.lastKnownLocation = parsed;
          }
        }
      } catch (e) {
        logger.warn(
          true,
          'LocationService: failed to hydrate last location',
          e
        );
      }

      this.isInitialized = true;
      logger.info(ENABLE_LOGGING, 'Location service initialized successfully');
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to initialize location service:',
        error
      );
      this.state.error = 'Failed to initialize location service';
    }
  }

  /**
   * Check current location permission status
   */
  async checkPermissionStatus(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } =
        await Location.getForegroundPermissionsAsync();

      const permissionStatus: LocationPermissionStatus = {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
        status,
      };

      this.state.permissionStatus = permissionStatus;
      // logger.info(ENABLE_LOGGING, 'Location permission status:', permissionStatus);

      return permissionStatus;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to check location permission status:',
        error
      );
      return this.state.permissionStatus;
    }
  }

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<LocationPermissionStatus> {
    try {
      // logger.info(ENABLE_LOGGING, 'Requesting location permissions');

      const { status, canAskAgain } =
        await Location.requestForegroundPermissionsAsync();

      const permissionStatus: LocationPermissionStatus = {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
        status,
      };

      this.state.permissionStatus = permissionStatus;
      this.state.error = null;

      // logger.info(ENABLE_LOGGING, 'Location permission request result:', permissionStatus);
      return permissionStatus;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to request location permissions:',
        error
      );
      this.state.error = 'Failed to request location permissions';
      return this.state.permissionStatus;
    }
  }

  /**
   * Get current location (one-time request)
   */
  async getCurrentLocation(
    options?: Location.LocationOptions
  ): Promise<LocationData | null> {
    try {
      if (!this.state.permissionStatus.granted) {
        // logger.warn(ENABLE_LOGGING, 'Location permission not granted');
        this.state.error = 'Location permission not granted';
        return null;
      }

      if (!this.state.isEnabled) {
        // logger.warn(ENABLE_LOGGING, 'Location services are disabled');
        this.state.error = 'Location services are disabled';
        return null;
      }

      this.state.isGettingLocation = true;
      this.state.error = null;

      // logger.info(ENABLE_LOGGING, 'Getting current location');

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000, // 10 seconds
        distanceInterval: 10, // 10 meters
        ...options,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp,
      };

      this.state.lastKnownLocation = locationData;
      this.state.isGettingLocation = false;

      // Persist for next run
      try {
        await AsyncStorage.setItem(
          LocationService.STORAGE_KEY_LAST_LOCATION,
          JSON.stringify(locationData)
        );
      } catch (e) {
        logger.warn(
          true,
          'LocationService: failed to persist last location',
          e
        );
      }

      // logger.info(ENABLE_LOGGING, 'Current location obtained:', {
      //   latitude: locationData.latitude,
      //   longitude: locationData.longitude,
      //   accuracy: locationData.accuracy,
      // });

      return locationData;
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Failed to get current location:', error);
      this.state.isGettingLocation = false;
      this.state.error = 'Failed to get current location';
      return null;
    }
  }

  /**
   * Start watching location (continuous updates)
   */
  async startLocationUpdates(
    options?: Location.LocationOptions,
    callback?: (location: LocationData) => void
  ): Promise<boolean> {
    try {
      if (!this.state.permissionStatus.granted) {
        logger.warn(
          true,
          'Location permission not granted for continuous updates'
        );
        this.state.error = 'Location permission not granted';
        return false;
      }

      if (!this.state.isEnabled) {
        logger.warn(ENABLE_LOGGING, 'Location services are disabled');
        this.state.error = 'Location services are disabled';
        return false;
      }

      // Stop any existing subscription
      await this.stopLocationUpdates();

      // logger.info(ENABLE_LOGGING, 'Starting location updates');

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // 30 seconds
          distanceInterval: 50, // 50 meters
          ...options,
        },
        location => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: location.timestamp,
          };

          this.state.lastKnownLocation = locationData;
          this.state.error = null;

          // Persist for next run
          (async () => {
            try {
              await AsyncStorage.setItem(
                LocationService.STORAGE_KEY_LAST_LOCATION,
                JSON.stringify(locationData)
              );
            } catch (e) {
              logger.warn(
                true,
                'LocationService: failed to persist last location',
                e
              );
            }
          })();

          logger.debug(ENABLE_LOGGING, 'Location update received:', {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy,
          });

          callback?.(locationData);
        }
      );

      // logger.info(ENABLE_LOGGING, 'Location updates started successfully');
      return true;
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Failed to start location updates:', error);
      this.state.error = 'Failed to start location updates';
      return false;
    }
  }

  /**
   * Stop watching location
   */
  async stopLocationUpdates(): Promise<void> {
    try {
      if (this.locationSubscription) {
        await this.locationSubscription.remove();
        this.locationSubscription = null;
        // logger.info(ENABLE_LOGGING, 'Location updates stopped');
      }
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Failed to stop location updates:', error);
    }
  }

  /**
   * Get last known location from cache
   */
  getLastKnownLocation(): LocationData | null {
    return this.state.lastKnownLocation;
  }

  /**
   * Get current service state
   */
  getState(): LocationServiceState {
    return { ...this.state };
  }

  /**
   * Check if location services are enabled
   */
  async checkLocationServices(): Promise<boolean> {
    try {
      const isEnabled = await Location.hasServicesEnabledAsync();
      this.state.isEnabled = isEnabled;
      return isEnabled;
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Failed to check location services:', error);
      return false;
    }
  }

  /**
   * Get location with timeout
   */
  async getLocationWithTimeout(
    timeoutMs: number = 10000
  ): Promise<LocationData | null> {
    try {
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(
          () => reject(new Error('Location request timeout')),
          timeoutMs
        );
      });

      const locationPromise = this.getCurrentLocation();

      const location = await Promise.race([locationPromise, timeoutPromise]);
      return location;
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Location request timed out:', error);
      this.state.error = 'Location request timed out';
      return null;
    }
  }

  /**
   * Get approximate location (lower accuracy, faster)
   */
  async getApproximateLocation(): Promise<LocationData | null> {
    return this.getCurrentLocation({
      accuracy: Location.Accuracy.Low,
      timeInterval: 5000,
      distanceInterval: 100,
    });
  }

  /**
   * Get precise location (higher accuracy, slower)
   */
  async getPreciseLocation(): Promise<LocationData | null> {
    return this.getCurrentLocation({
      accuracy: Location.Accuracy.High,
      timeInterval: 15000,
      distanceInterval: 5,
    });
  }

  /**
   * Calculate distance between two locations (in meters)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Check if location is within a certain radius of a point
   */
  isLocationWithinRadius(
    centerLat: number,
    centerLon: number,
    radiusMeters: number,
    location?: LocationData | null
  ): boolean {
    if (!location) {
      location = this.state.lastKnownLocation;
    }

    if (!location) {
      return false;
    }

    const distance = this.calculateDistance(
      centerLat,
      centerLon,
      location.latitude,
      location.longitude
    );

    return distance <= radiusMeters;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.stopLocationUpdates();
      this.isInitialized = false;
      // logger.info(ENABLE_LOGGING, 'Location service cleaned up');
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to cleanup location service:',
        error
      );
    }
  }
}

// Export singleton instance
export const locationService = LocationService.getInstance();
