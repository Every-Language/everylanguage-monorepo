import { useEffect, useRef, useState } from 'react';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

type ReadyStatus = 'checking' | 'initializing' | 'ready' | 'error';

// Minimum row thresholds for core structure (inclusive)
const MIN_BOOKS = 66;
const MIN_CHAPTERS = 1189;
const MIN_VERSES = 31102;

interface BibleStructureReadyState {
  status: ReadyStatus;
  message: string;
  error: string | null;
  isReady: boolean;
  checkNow: () => void;
}

/**
 * Watches the four core Bible structure tables and resolves when data is available.
 * If offline, immediately marks as ready to allow onboarding to proceed.
 */
export const useBibleStructureReady = (): BibleStructureReadyState => {
  const [status, setStatus] = useState<ReadyStatus>('checking');
  const [message, setMessage] = useState('Checking Bible data...');
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const retryToken = useRef(0);

  const check = async (token: number) => {
    try {
      setError(null);
      if (!powerSyncSystem.isInitialized) {
        setStatus('initializing');
        setMessage('Initializing database...');
        await powerSyncSystem.initialize();
      }

      setStatus('initializing');
      setMessage('Syncing Bible data...');

      // Watch counts across the four core tables.
      const watcher = await powerSyncSystem.watch(
        `SELECT 
           (SELECT COUNT(1) FROM bible_versions) AS v,
           (SELECT COUNT(1) FROM books) AS b,
           (SELECT COUNT(1) FROM chapters) AS c,
           (SELECT COUNT(1) FROM verses) AS vs`
      );

      // Also poll as a fallback in case the watch stream doesn't emit on large batches
      let stop = false;
      const poll = async () => {
        while (!stop && token === retryToken.current) {
          const row = (await powerSyncSystem.get(
            `SELECT 
               (SELECT COUNT(1) FROM bible_versions) AS v,
               (SELECT COUNT(1) FROM books) AS b,
               (SELECT COUNT(1) FROM chapters) AS c,
               (SELECT COUNT(1) FROM verses) AS vs`
          )) as { v?: number; b?: number; c?: number; vs?: number } | undefined;
          const v = Number(row?.v ?? 0);
          const b = Number(row?.b ?? 0);
          const c = Number(row?.c ?? 0);
          const vs = Number(row?.vs ?? 0);
          if (
            v > 0 &&
            b >= MIN_BOOKS &&
            c >= MIN_CHAPTERS &&
            vs >= MIN_VERSES
          ) {
            setStatus('ready');
            setMessage('Bible data ready');
            setIsReady(true);
            return;
          }
          setStatus('initializing');
          setMessage(
            `Syncing Bible data... (${b}/${MIN_BOOKS} books, ${c}/${MIN_CHAPTERS} chapters, ${vs}/${MIN_VERSES} verses)`
          );
          await new Promise(r => setTimeout(r, 500));
        }
      };
      void poll();

      for await (const rows of watcher as AsyncIterable<
        Array<{ v: number; b: number; c: number; vs: number }>
      >) {
        if (token !== retryToken.current) return; // cancelled by retry
        const r = rows?.[0];
        const v = Number(r?.v ?? 0);
        const b = Number(r?.b ?? 0);
        const c = Number(r?.c ?? 0);
        const vs = Number(r?.vs ?? 0);

        // Basic readiness: all four tables have some rows present
        if (v > 0 && b >= MIN_BOOKS && c >= MIN_CHAPTERS && vs >= MIN_VERSES) {
          stop = true;
          setStatus('ready');
          setMessage('Bible data ready');
          setIsReady(true);
          break;
        } else {
          setStatus('initializing');
          setMessage(
            `Syncing Bible data... (${b}/${MIN_BOOKS} books, ${c}/${MIN_CHAPTERS} chapters, ${vs}/${MIN_VERSES} verses)`
          );
        }
      }
    } catch (e) {
      logger.error(
        ENABLE_LOGGING,
        'useBibleStructureReady: failed to verify readiness',
        e
      );
      setStatus('error');
      setMessage('Failed to verify Bible data');
      setError(e instanceof Error ? e.message : 'Unknown error');
      setIsReady(false);
    }
  };

  useEffect(() => {
    retryToken.current += 1;
    void check(retryToken.current);
  }, []);

  return {
    status,
    message,
    error,
    isReady,
    checkNow: () => {
      retryToken.current += 1;
      void check(retryToken.current);
    },
  };
};
