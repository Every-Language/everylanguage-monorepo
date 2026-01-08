import { useEffect, useMemo, useState } from 'react';
import type { AudioVersion, TextVersion } from '../types/entities';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';

export interface TestamentProgress {
  completed: number;
  total: number;
}

export interface VersionCompletenessState {
  loading: boolean;
  error: string | null;
  languageName: string;
  regionName: string;
  ot: TestamentProgress;
  nt: TestamentProgress;
  overallPercent: number; // 0-100 rounded integer
}

/**
 * Hook to compute completeness for a version (audio or text) using local PowerSync DB.
 * Also resolves cached language/region labels from `version_language_lookup`.
 */
export const useVersionCompleteness = (
  version: AudioVersion | TextVersion | null | undefined,
  versionType?: 'audio' | 'text'
): VersionCompletenessState => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [languageName, setLanguageName] = useState<string>('');
  const [regionName, setRegionName] = useState<string>('');
  const [ot, setOt] = useState<TestamentProgress>({ completed: 0, total: 0 });
  const [nt, setNt] = useState<TestamentProgress>({ completed: 0, total: 0 });

  const resolvedType: 'audio' | 'text' | null = useMemo(() => {
    if (!version) return null;
    if (versionType) return versionType;
    // Heuristic: AudioVersion has mediaFileCount, TextVersion has source
    return (version as AudioVersion).mediaFileCount !== undefined
      ? 'audio'
      : 'text';
  }, [version, versionType]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!version || !resolvedType) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        // Resolve language/region labels from cache table if available
        try {
          const rows = await powerSyncSystem.getAll(
            `SELECT language_alias_name, language_entity_name, region_name FROM version_language_lookup WHERE version_id = ? LIMIT 1`,
            [version.id]
          );
          if (!cancelled && rows?.length) {
            const r = rows[0] as {
              language_alias_name: string | null;
              language_entity_name: string | null;
              region_name: string | null;
            };
            setLanguageName(
              r.language_alias_name || r.language_entity_name || ''
            );
            setRegionName(r.region_name || '');
          }
        } catch {
          // Non-fatal: cache may not be present
        }

        if (resolvedType === 'audio') {
          const otRows = await powerSyncSystem.getAll(
            `SELECT 
               SUM(has_media) AS completed,
               COUNT(1) AS total
             FROM (
               SELECT c.id,
                 CASE WHEN EXISTS (
                   SELECT 1 FROM media_files mf WHERE mf.chapter_id = c.id AND mf.audio_version_id = ? AND mf.publish_status = 'published' AND mf.deleted_at IS NULL
                 ) THEN 1 ELSE 0 END AS has_media,
                 b.testament
               FROM chapters c
               JOIN books b ON b.id = c.book_id
             ) x
             WHERE x.testament = 'old'`,
            [version.id]
          );
          const ntRows = await powerSyncSystem.getAll(
            `SELECT 
               SUM(has_media) AS completed,
               COUNT(1) AS total
             FROM (
               SELECT c.id,
                 CASE WHEN EXISTS (
                   SELECT 1 FROM media_files mf WHERE mf.chapter_id = c.id AND mf.audio_version_id = ? AND mf.publish_status = 'published' AND mf.deleted_at IS NULL
                 ) THEN 1 ELSE 0 END AS has_media,
                 b.testament
               FROM chapters c
               JOIN books b ON b.id = c.book_id
             ) x
             WHERE x.testament = 'new'`,
            [version.id]
          );
          const otRow =
            (otRows?.[0] as {
              completed?: number | null;
              total?: number | null;
            }) || {};
          const ntRow =
            (ntRows?.[0] as {
              completed?: number | null;
              total?: number | null;
            }) || {};
          if (!cancelled) {
            setOt({
              completed: Number(otRow.completed) || 0,
              total: Number(otRow.total) || 0,
            });
            setNt({
              completed: Number(ntRow.completed) || 0,
              total: Number(ntRow.total) || 0,
            });
          }
        } else {
          const otRows = await powerSyncSystem.getAll(
            `SELECT 
               SUM(has_text) AS completed,
               COUNT(1) AS total
             FROM (
               SELECT c.id,
                 CASE WHEN EXISTS (
                   SELECT 1 FROM verse_texts vt WHERE vt.text_version_id = ? AND vt.verse_id IN (
                     SELECT v.id FROM verses v WHERE v.chapter_id = c.id
                   )
                 ) THEN 1 ELSE 0 END AS has_text,
                 b.testament
               FROM chapters c
               JOIN books b ON b.id = c.book_id
             ) x
             WHERE x.testament = 'old'`,
            [version.id]
          );
          const ntRows = await powerSyncSystem.getAll(
            `SELECT 
               SUM(has_text) AS completed,
               COUNT(1) AS total
             FROM (
               SELECT c.id,
                 CASE WHEN EXISTS (
                   SELECT 1 FROM verse_texts vt WHERE vt.text_version_id = ? AND vt.verse_id IN (
                     SELECT v.id FROM verses v WHERE v.chapter_id = c.id
                   )
                 ) THEN 1 ELSE 0 END AS has_text,
                 b.testament
               FROM chapters c
               JOIN books b ON b.id = c.book_id
             ) x
             WHERE x.testament = 'new'`,
            [version.id]
          );
          const otRow =
            (otRows?.[0] as {
              completed?: number | null;
              total?: number | null;
            }) || {};
          const ntRow =
            (ntRows?.[0] as {
              completed?: number | null;
              total?: number | null;
            }) || {};
          if (!cancelled) {
            setOt({
              completed: Number(otRow.completed) || 0,
              total: Number(otRow.total) || 0,
            });
            setNt({
              completed: Number(ntRow.completed) || 0,
              total: Number(ntRow.total) || 0,
            });
          }
        }
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : 'Failed to compute completeness'
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [version, resolvedType]);

  const overallPercent = useMemo(() => {
    const total = (ot.total || 0) + (nt.total || 0);
    const completed = (ot.completed || 0) + (nt.completed || 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [ot, nt]);

  return {
    loading,
    error,
    languageName,
    regionName,
    ot,
    nt,
    overallPercent,
  };
};
