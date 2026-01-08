// Network Error Classification Service
// Distinguishes network-related errors from other types of errors

export interface NetworkError extends Error {
  type: 'NETWORK_ERROR' | 'TIMEOUT_ERROR' | 'SERVER_ERROR' | 'UNKNOWN_ERROR';
  isRetryable: boolean;
  isNetworkRelated: boolean;
}

export interface NetworkErrorClassification {
  isNetworkError: boolean;
  isRetryable: boolean;
  errorType: NetworkError['type'];
}

/**
 * Network Error Classification Service
 * Distinguishes network-related errors from other types of errors
 */
export class NetworkErrorClassifier {
  private static instance: NetworkErrorClassifier;

  static getInstance(): NetworkErrorClassifier {
    if (!NetworkErrorClassifier.instance) {
      NetworkErrorClassifier.instance = new NetworkErrorClassifier();
    }
    return NetworkErrorClassifier.instance;
  }

  /**
   * Classify an error to determine if it's network-related
   */
  classifyError(error: unknown): NetworkErrorClassification {
    if (!(error instanceof Error)) {
      return {
        isNetworkError: false,
        isRetryable: false,
        errorType: 'UNKNOWN_ERROR',
      };
    }

    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Network connectivity errors
    if (
      errorMessage.includes('network request failed') ||
      errorMessage.includes('network error') ||
      errorMessage.includes('connection failed') ||
      errorMessage.includes('connection refused') ||
      errorMessage.includes('connection reset') ||
      errorMessage.includes('connection timeout') ||
      errorMessage.includes('no internet connection') ||
      errorMessage.includes('network is unreachable') ||
      errorMessage.includes('host is unreachable') ||
      errorName.includes('networkerror') ||
      errorName.includes('typeerror')
    ) {
      return {
        isNetworkError: true,
        isRetryable: true,
        errorType: 'NETWORK_ERROR',
      };
    }

    // Timeout errors
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('request timeout') ||
      errorMessage.includes('connection timeout') ||
      errorMessage.includes('read timeout') ||
      errorName.includes('timeout')
    ) {
      return {
        isNetworkError: true,
        isRetryable: true,
        errorType: 'TIMEOUT_ERROR',
      };
    }

    // Server errors (5xx status codes)
    if (
      errorMessage.includes('500') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503') ||
      errorMessage.includes('504') ||
      errorMessage.includes('gateway timeout') ||
      errorMessage.includes('bad gateway') ||
      errorMessage.includes('service unavailable')
    ) {
      return {
        isNetworkError: true,
        isRetryable: true,
        errorType: 'SERVER_ERROR',
      };
    }

    // Fetch API specific errors
    if (
      errorName === 'TypeError' &&
      (errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('connection'))
    ) {
      return {
        isNetworkError: true,
        isRetryable: true,
        errorType: 'NETWORK_ERROR',
      };
    }

    // AbortError (request cancelled)
    if (errorName === 'AbortError') {
      return {
        isNetworkError: false,
        isRetryable: false,
        errorType: 'UNKNOWN_ERROR',
      };
    }

    // Not a network error
    return {
      isNetworkError: false,
      isRetryable: false,
      errorType: 'UNKNOWN_ERROR',
    };
  }

  /**
   * Create a classified network error
   */
  createNetworkError(error: unknown): NetworkError {
    const classification = this.classifyError(error);

    const networkError =
      error instanceof Error ? error : new Error('Unknown error');

    return {
      ...networkError,
      type: classification.errorType,
      isRetryable: classification.isRetryable,
      isNetworkRelated: classification.isNetworkError,
    };
  }

  /**
   * Check if an error is network-related
   */
  isNetworkError(error: unknown): boolean {
    return this.classifyError(error).isNetworkError;
  }

  /**
   * Check if an error is retryable
   */
  isRetryableError(error: unknown): boolean {
    return this.classifyError(error).isRetryable;
  }

  /**
   * Get error type
   */
  getErrorType(error: unknown): NetworkError['type'] {
    return this.classifyError(error).errorType;
  }
}

// Export singleton instance
export const networkErrorClassifier = NetworkErrorClassifier.getInstance();
