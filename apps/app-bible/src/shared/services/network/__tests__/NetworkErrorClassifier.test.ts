import { networkErrorClassifier } from '../NetworkErrorClassifier';

describe('NetworkErrorClassifier', () => {
  describe('classifyError', () => {
    it('should classify network request failed as network error', () => {
      const error = new Error('Network request failed');
      const classification = networkErrorClassifier.classifyError(error);

      expect(classification.isNetworkError).toBe(true);
      expect(classification.isRetryable).toBe(true);
      expect(classification.errorType).toBe('NETWORK_ERROR');
    });

    it('should classify timeout errors as network error', () => {
      const error = new Error('Request timeout');
      const classification = networkErrorClassifier.classifyError(error);

      expect(classification.isNetworkError).toBe(true);
      expect(classification.isRetryable).toBe(true);
      expect(classification.errorType).toBe('TIMEOUT_ERROR');
    });

    it('should classify server errors as network error', () => {
      const error = new Error('500 Internal Server Error');
      const classification = networkErrorClassifier.classifyError(error);

      expect(classification.isNetworkError).toBe(true);
      expect(classification.isRetryable).toBe(true);
      expect(classification.errorType).toBe('SERVER_ERROR');
    });

    it('should not classify non-network errors as network error', () => {
      const error = new Error('Validation failed');
      const classification = networkErrorClassifier.classifyError(error);

      expect(classification.isNetworkError).toBe(false);
      expect(classification.isRetryable).toBe(false);
      expect(classification.errorType).toBe('UNKNOWN_ERROR');
    });

    it('should handle TypeError with network-related messages', () => {
      const error = new TypeError('Network request failed');
      const classification = networkErrorClassifier.classifyError(error);

      expect(classification.isNetworkError).toBe(true);
      expect(classification.isRetryable).toBe(true);
      expect(classification.errorType).toBe('NETWORK_ERROR');
    });

    it('should handle AbortError as non-network error', () => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      const classification = networkErrorClassifier.classifyError(error);

      expect(classification.isNetworkError).toBe(false);
      expect(classification.isRetryable).toBe(false);
      expect(classification.errorType).toBe('UNKNOWN_ERROR');
    });
  });

  describe('isNetworkError', () => {
    it('should return true for network errors', () => {
      const error = new Error('Network request failed');
      expect(networkErrorClassifier.isNetworkError(error)).toBe(true);
    });

    it('should return false for non-network errors', () => {
      const error = new Error('Validation failed');
      expect(networkErrorClassifier.isNetworkError(error)).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for retryable network errors', () => {
      const error = new Error('Network request failed');
      expect(networkErrorClassifier.isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error = new Error('Validation failed');
      expect(networkErrorClassifier.isRetryableError(error)).toBe(false);
    });
  });

  describe('getErrorType', () => {
    it('should return correct error type for network errors', () => {
      const error = new Error('Network request failed');
      expect(networkErrorClassifier.getErrorType(error)).toBe('NETWORK_ERROR');
    });

    it('should return UNKNOWN_ERROR for non-network errors', () => {
      const error = new Error('Validation failed');
      expect(networkErrorClassifier.getErrorType(error)).toBe('UNKNOWN_ERROR');
    });
  });
});
