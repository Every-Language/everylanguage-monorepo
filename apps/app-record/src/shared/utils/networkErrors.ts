/**
 * Network error detection utilities
 *
 * Helps identify network-related errors from various sources (Supabase, fetch, etc.)
 */

export interface NetworkError extends Error {
  isNetworkError: boolean;
  isOffline: boolean;
  originalError: unknown;
}

/**
 * Check if an error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  // Check for common network error patterns
  const errorString = String(error).toLowerCase();
  const errorMessage =
    error instanceof Error ? error.message.toLowerCase() : errorString;

  // Network-related keywords
  const networkKeywords = [
    'network',
    'fetch',
    'connection',
    'timeout',
    'offline',
    'enotfound',
    'econnrefused',
    'econnreset',
    'etimedout',
    'eai_again',
    'dns',
    'internet',
    'unreachable',
  ];

  if (networkKeywords.some(keyword => errorMessage.includes(keyword))) {
    return true;
  }

  // Check for Supabase network errors
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;

    // Supabase PostgREST errors with network-related codes
    if (errorObj['code'] === 'PGRST301' || errorObj['code'] === 'PGRST302') {
      return true; // Connection timeout or connection refused
    }

    // Check for fetch-related errors
    if (
      errorObj['name'] === 'NetworkError' ||
      errorObj['name'] === 'TypeError'
    ) {
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        return true;
      }
    }

    // Check for HTTP status codes that indicate network issues
    if (typeof errorObj['status'] === 'number') {
      // 0 typically means network error (no response)
      if (errorObj['status'] === 0) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if device is offline based on error
 */
export function isOfflineError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  const offlineKeywords = [
    'offline',
    'no internet',
    'no connection',
    'network unavailable',
    'connection refused',
  ];

  return offlineKeywords.some(keyword => errorMessage.includes(keyword));
}

/**
 * Create a standardized network error
 */
export function createNetworkError(
  error: unknown,
  defaultMessage: string = 'Network error occurred'
): NetworkError {
  const isNetwork = isNetworkError(error);
  const isOffline = isOfflineError(error);

  const message = isOffline
    ? 'No internet connection. Please check your network settings.'
    : isNetwork
      ? 'Network error. Please check your connection and try again.'
      : error instanceof Error
        ? error.message
        : defaultMessage;

  return {
    name: 'NetworkError',
    message,
    isNetworkError: isNetwork,
    isOffline,
    originalError: error,
  } as NetworkError;
}

/**
 * Get user-friendly error message for network errors
 */
export function getNetworkErrorMessage(error: unknown): string {
  if (isOfflineError(error)) {
    return 'No internet connection. Please check your network settings and try again.';
  }

  if (isNetworkError(error)) {
    return 'Network error. Please check your connection and try again.';
  }

  return error instanceof Error
    ? error.message
    : 'An error occurred. Please try again.';
}
