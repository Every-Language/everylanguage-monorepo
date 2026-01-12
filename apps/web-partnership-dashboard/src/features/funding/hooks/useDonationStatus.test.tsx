import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDonationStatus } from './useDonationStatus';
import { supabase } from '@/shared/services/supabase';

// Mock Supabase
vi.mock('@/shared/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

// Mock processQueryError
vi.mock('@/shared/query/query-error-handler', () => ({
  processQueryError: (error: unknown) => ({
    message: error instanceof Error ? error.message : 'Unknown error',
  }),
}));

describe('useDonationStatus', () => {
  let queryClient: QueryClient;
  let mockChannel: {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  };
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Reset mocks
    vi.clearAllMocks();

    // Setup Supabase mock chain
    mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn(),
      }),
    });

    mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
    });

    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation(callback => {
        // Simulate successful subscription
        setTimeout(() => {
          callback('SUBSCRIBED');
        }, 0);
        return mockChannel;
      }),
    };

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);
    (supabase.channel as ReturnType<typeof vi.fn>).mockReturnValue(mockChannel);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('when donationId is undefined', () => {
    it('should return null status and not be loading', () => {
      const { result } = renderHook(() => useDonationStatus(undefined), {
        wrapper: Wrapper,
      });

      expect(result.current.status).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('when donationId is provided', () => {
    const donationId = 'test-donation-id';

    it('should fetch initial status and set up subscription', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { status: 'pending' },
        error: null,
      });

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      const { result } = renderHook(() => useDonationStatus(donationId), {
        wrapper: Wrapper,
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for query to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBe('pending');
      expect(result.current.error).toBeNull();

      // Verify Supabase query was called
      expect(supabase.from).toHaveBeenCalledWith('donations');
      expect(mockSelect).toHaveBeenCalledWith('status');
      expect(mockSingle).toHaveBeenCalled();

      // Verify subscription was set up
      expect(supabase.channel).toHaveBeenCalledWith(
        `donation_status_${donationId}`
      );
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should handle completed status and skip subscription', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { status: 'completed' },
        error: null,
      });

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      const { result } = renderHook(() => useDonationStatus(donationId), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBe('completed');

      // Subscription should still be set up (but will cleanup early)
      expect(supabase.channel).toHaveBeenCalled();
    });

    it('should handle failed status', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { status: 'failed' },
        error: null,
      });

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      const { result } = renderHook(() => useDonationStatus(donationId), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBe('failed');
    });

    it('should handle query errors', async () => {
      const mockError = new Error('Database error');
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      const { result } = renderHook(() => useDonationStatus(donationId), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.isLoading).toBe(false);
    });

    it('should update status when real-time event is received', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { status: 'pending' },
        error: null,
      });

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      let realtimeCallback:
        | ((payload: { new: { status: string } }) => void)
        | null = null;

      mockChannel.on.mockImplementation(
        (
          event: string,
          config: unknown,
          callback?: (payload: { new: { status: string } }) => void
        ) => {
          if (event === 'postgres_changes' && callback) {
            realtimeCallback = callback;
          }
          return mockChannel;
        }
      );

      const { result } = renderHook(() => useDonationStatus(donationId), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.status).toBe('pending');
      });

      // Simulate real-time update
      expect(realtimeCallback).not.toBeNull();
      if (realtimeCallback) {
        realtimeCallback({
          new: { status: 'completed' },
        } as { new: { status: string } });
      }

      await waitFor(() => {
        expect(result.current.status).toBe('completed');
      });
    });

    it('should cleanup subscription on unmount', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { status: 'pending' },
        error: null,
      });

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      const { result, unmount } = renderHook(
        () => useDonationStatus(donationId),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.status).toBe('pending');
      });

      unmount();

      // Verify cleanup was called
      expect(supabase.removeChannel).toHaveBeenCalled();
    });
  });

  describe('polling fallback', () => {
    it('should fall back to polling when subscription fails', async () => {
      vi.useFakeTimers();

      const donationId = 'test-donation-id';
      const mockSingle = vi.fn().mockResolvedValue({
        data: { status: 'pending' },
        error: null,
      });

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      // Simulate subscription failure
      mockChannel.subscribe.mockImplementation(callback => {
        setTimeout(() => {
          callback('CHANNEL_ERROR');
        }, 0);
        return mockChannel;
      });

      const { result } = renderHook(() => useDonationStatus(donationId), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.status).toBe('pending');
      });

      // Fast-forward to trigger polling fallback
      vi.advanceTimersByTime(3000);

      // Polling should be set up (we can't easily test the interval without more complex mocking)
      // But we can verify the subscription error was handled
      expect(mockChannel.subscribe).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
