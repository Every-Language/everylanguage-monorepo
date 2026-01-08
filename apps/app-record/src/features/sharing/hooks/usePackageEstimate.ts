import { useEffect, useMemo, useState } from 'react';
import { powerSyncSystem } from '@/shared/services/powersync';
import type {
  AudioPackageScope,
  TextPackageScope,
  PackageEstimate,
} from '../types';

const TARGET_PART_BYTES = 10000 * 1024 * 1024; // ~10gb. TODO: set this to lower after multi package is tested

export function usePackageEstimate(
  kind: 'audio' | 'text',
  versionId: string | null,
  scope?: AudioPackageScope | TextPackageScope
): { loading: boolean; estimate: PackageEstimate | null } {
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<PackageEstimate | null>(null);

  const scopeKey = useMemo(() => {
    if (!scope) return 'none';
    if (scope.mode === 'books') {
      return `books:${(scope.bookIds || []).join(',')}`;
    }
    return scope.mode;
  }, [scope]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!versionId || !powerSyncSystem.isInitialized) {
        setEstimate(null);
        return;
      }
      setLoading(true);
      try {
        if (kind === 'audio') {
          let sql: string;
          let args: unknown[];
          if (scope?.mode === 'books' && scope.bookIds.length > 0) {
            const placeholders = scope.bookIds.map(() => '?').join(',');
            sql = `SELECT mf.id, COALESCE(mfd.file_size_bytes, mf.file_size) AS size
               FROM media_files mf
               LEFT JOIN media_files_downloads mfd ON mfd.media_file_id = mf.id
               WHERE mf.audio_version_id = ?
                 AND mf.chapter_id IN (
                   SELECT c.id FROM chapters c WHERE c.book_id IN (${placeholders})
                 )
                 AND mf.object_key IS NOT NULL AND mf.object_key <> ''
                 AND mf.deleted_at IS NULL`;
            args = [versionId, ...scope.bookIds];
          } else {
            sql = `SELECT mf.id, COALESCE(mfd.file_size_bytes, mf.file_size) AS size
               FROM media_files mf
               LEFT JOIN media_files_downloads mfd ON mfd.media_file_id = mf.id
               WHERE mf.audio_version_id = ?
                 AND mf.object_key IS NOT NULL AND mf.object_key <> ''
                 AND mf.deleted_at IS NULL`;
            args = [versionId];
          }
          const rows = (await powerSyncSystem.getAll(sql, args)) as Array<{
            id: string;
            size: number | null;
          }>;

          let total = 0;
          let count = 0;
          for (const r of rows) {
            const sz = Number(r?.size ?? 0);
            if (Number.isFinite(sz) && sz > 0) {
              total += sz;
              count += 1;
            }
          }
          const willSplit = total > TARGET_PART_BYTES;
          const partCount = willSplit
            ? Math.ceil(total / TARGET_PART_BYTES)
            : 1;
          if (!cancelled)
            setEstimate({
              totalBytes: total,
              fileCount: count,
              willSplit,
              partCount,
            });
        } else if (kind === 'text') {
          let sql: string;
          let args: unknown[];
          if (scope?.mode === 'books' && scope.bookIds.length > 0) {
            const placeholders = scope.bookIds.map(() => '?').join(',');
            sql = `SELECT vt.id, LENGTH(vt.verse_text) AS text_length
               FROM verse_texts vt
               INNER JOIN verses v ON v.id = vt.verse_id
               INNER JOIN chapters c ON c.id = v.chapter_id
               INNER JOIN books b ON b.id = c.book_id
               WHERE vt.text_version_id = ?
                 AND b.id IN (${placeholders})
                 AND vt.deleted_at IS NULL`;
            args = [versionId, ...scope.bookIds];
          } else {
            sql = `SELECT vt.id, LENGTH(vt.verse_text) AS text_length
               FROM verse_texts vt
               WHERE vt.text_version_id = ?
                 AND vt.deleted_at IS NULL`;
            args = [versionId];
          }
          const rows = (await powerSyncSystem.getAll(sql, args)) as Array<{
            id: string;
            text_length: number | null;
          }>;

          let total = 0;
          let count = 0;
          for (const r of rows) {
            const textLen = Number(r?.text_length ?? 0);
            if (Number.isFinite(textLen) && textLen > 0) {
              // Estimate UTF-8 encoding (up to 2 bytes per character)
              total += textLen * 2;
              count += 1;
            }
          }
          const willSplit = total > TARGET_PART_BYTES;
          const partCount = willSplit
            ? Math.ceil(total / TARGET_PART_BYTES)
            : 1;
          if (!cancelled)
            setEstimate({
              totalBytes: total,
              fileCount: count,
              willSplit,
              partCount,
            });
        } else {
          if (!cancelled)
            setEstimate({
              totalBytes: 0,
              fileCount: 0,
              willSplit: false,
              partCount: 1,
            });
        }
      } catch {
        if (!cancelled) setEstimate(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [kind, versionId, scopeKey, scope?.mode, scope]);

  return { loading, estimate };
}
