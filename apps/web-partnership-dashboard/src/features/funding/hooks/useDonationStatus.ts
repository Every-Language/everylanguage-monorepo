import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { processQueryError } from '@/shared/query/query-error-handler';
import type { Database } from '@everylanguage/shared-types';

type DonationStatus = Database['public']['Enums']['donation_status'];

const TERMINAL_STATES: readonly DonationStatus[] = [
  'completed',
  'failed',
  'cancelled',
  'refunded',
] as const;

const VERIFICATION_TIMEOUT_MS = 60 * 1000; // 60 seconds
const POLLING_INTERVAL_MS = 2000; // 2 seconds
const REALTIME_FALLBACK_DELAY_MS = 3000; // 3 seconds before falling back to polling

interface UseDonationStatusResult {
  status: DonationStatus | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to monitor donation status with real-time subscription and polling fallback.
 *
 * Features:
 * - Real-time subscription to donations table for immediate status updates
 * - Automatic fallback to polling if real-time subscription fails
 * - Auto-cleanup after 60 seconds or when status reaches terminal state
 * - Handles undefined/null donationId gracefully
 *
 * @param donationId - The donation ID to monitor (can be undefined/null)
 * @returns Object with status, isLoading, and error
 */
export function useDonationStatus(
  donationId: string | undefined
): UseDonationStatusResult {
  const [status, setStatus] = useState<DonationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [usePolling, setUsePolling] = useState(false);

  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeFallbackRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Query key factory for consistency
  const donationStatusKeys = {
    all: ['donation-status'] as const,
    byId: (id: string) => [...donationStatusKeys.all, id] as const,
  };

  // Fetch initial donation status
  const {
    data: initialStatus,
    isLoading: queryLoading,
    error: queryError,
  } = useQuery({
    queryKey: donationStatusKeys.byId(donationId ?? ''),
    queryFn: async (): Promise<DonationStatus | null> => {
      if (!donationId) return null;

      const { data, error: fetchError } = await supabase
        .from('donations')
        .select('status')
        .eq('id', donationId)
        .single<{ status: DonationStatus }>();

      if (fetchError) {
        const processedError = processQueryError(fetchError);
        throw new Error(processedError.message);
      }

      return (data?.status as DonationStatus) ?? null;
    },
    enabled: !!donationId,
    staleTime: 0, // Always fetch fresh status initially
    retry: 2,
  });

  // Set up real-time subscription with polling fallback
  useEffect(() => {
    if (!donationId) {
      setStatus(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    isMountedRef.current = true;
    setIsLoading(true);
    setError(null);

    // Set initial status from query
    if (initialStatus) {
      setStatus(initialStatus);
      setIsLoading(false);

      // If already in terminal state, skip subscription
      if (TERMINAL_STATES.includes(initialStatus)) {
        return;
      }
    }

    // Set up real-time subscription
    const channelName = `donation_status_${donationId}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'donations',
          filter: `id=eq.${donationId}`,
        },
        payload => {
          if (!isMountedRef.current) return;

          const newStatus = payload.new.status as DonationStatus;
          console.log(`📡 Donation ${donationId} status updated: ${newStatus}`);

          setStatus(newStatus);
          setIsLoading(false);

          // If reached terminal state, cleanup
          if (TERMINAL_STATES.includes(newStatus)) {
            cleanup();
          }
        }
      )
      .subscribe(subscriptionStatus => {
        if (!isMountedRef.current) return;

        console.log(
          `🔔 Donation status subscription ${channelName}:`,
          subscriptionStatus
        );

        if (subscriptionStatus === 'SUBSCRIBED') {
          setIsLoading(false);
          // Clear fallback timer since subscription is working
          if (realtimeFallbackRef.current) {
            clearTimeout(realtimeFallbackRef.current);
            realtimeFallbackRef.current = null;
          }
        } else if (
          subscriptionStatus === 'CHANNEL_ERROR' ||
          subscriptionStatus === 'TIMED_OUT' ||
          subscriptionStatus === 'CLOSED'
        ) {
          console.warn(
            `⚠️ Real-time subscription failed for ${donationId}, falling back to polling`
          );
          // Fallback to polling after a short delay
          realtimeFallbackRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setUsePolling(true);
            }
          }, REALTIME_FALLBACK_DELAY_MS);
        }
      });

    subscriptionRef.current = subscription;

    // Set up polling fallback (if real-time fails)
    if (usePolling) {
      pollingIntervalRef.current = setInterval(async () => {
        if (!isMountedRef.current || !donationId) return;

        try {
          const { data, error: fetchError } = await supabase
            .from('donations')
            .select('status')
            .eq('id', donationId)
            .single<{ status: DonationStatus }>();

          if (fetchError) {
            const processedError = processQueryError(fetchError);
            setError(new Error(processedError.message));
            return;
          }

          const currentStatus = (data?.status as DonationStatus) ?? null;
          if (currentStatus) {
            setStatus((prevStatus: DonationStatus | null) => {
              // Only update if status changed
              if (prevStatus !== currentStatus) {
                setIsLoading(false);

                // If reached terminal state, cleanup
                if (TERMINAL_STATES.includes(currentStatus)) {
                  cleanup();
                }

                return currentStatus;
              }
              return prevStatus;
            });
          }
        } catch (err) {
          const processedError = processQueryError(err);
          setError(new Error(processedError.message));
        }
      }, POLLING_INTERVAL_MS);
    }

    // Set timeout to cleanup after 60 seconds
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        console.log(
          `⏱️ Verification timeout reached for donation ${donationId}, cleaning up`
        );
        cleanup();
      }
    }, VERIFICATION_TIMEOUT_MS);

    // Cleanup function
    function cleanup(): void {
      if (subscriptionRef.current) {
        try {
          supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        } catch (err) {
          console.warn('Failed to remove donation status subscription:', err);
        }
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      if (realtimeFallbackRef.current) {
        clearTimeout(realtimeFallbackRef.current);
        realtimeFallbackRef.current = null;
      }
    }

    // Cleanup on unmount or dependency change
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [donationId, initialStatus, usePolling]);

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      const processedError = processQueryError(queryError);
      setError(new Error(processedError.message));
      setIsLoading(false);
    }
  }, [queryError]);

  // Update loading state based on query
  useEffect(() => {
    if (queryLoading && donationId) {
      setIsLoading(true);
    }
  }, [queryLoading, donationId]);

  return {
    status,
    isLoading,
    error,
  };
}
