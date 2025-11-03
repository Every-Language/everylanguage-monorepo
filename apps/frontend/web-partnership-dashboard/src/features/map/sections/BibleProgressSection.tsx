import React from 'react';
import { useBibleProgress } from '../hooks/useBibleProgress';
import { ProgressRing } from '../components/shared/ProgressRing';
import { maxCoveragePercent } from '../inspector/queries/progress';

type BibleProgressSectionProps = {
  languageId: string;
  descendantIds?: string[];
  includeDescendants?: boolean;
};

/**
 * Bible Progress Section displays audio and text translation progress
 * with progress rings and detailed version tables
 */
export const BibleProgressSection: React.FC<BibleProgressSectionProps> = ({
  languageId,
  descendantIds = [languageId],
  includeDescendants = true,
}) => {
  const [showDescendants, setShowDescendants] =
    React.useState(includeDescendants);
  const langIds = React.useMemo(
    () => (showDescendants ? descendantIds : [languageId]),
    [showDescendants, descendantIds, languageId]
  );

  const { audioVersions, textVersions } = useBibleProgress(langIds);

  const audioProgress = React.useMemo(() => {
    if (!audioVersions.data || audioVersions.data.length === 0) return 0;
    return Math.round(
      Math.max(...audioVersions.data.map(maxCoveragePercent)) * 100
    );
  }, [audioVersions.data]);

  const textProgress = React.useMemo(() => {
    if (!textVersions.data || textVersions.data.length === 0) return 0;
    return Math.round(
      Math.max(...textVersions.data.map(maxCoveragePercent)) * 100
    );
  }, [textVersions.data]);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='font-semibold'>Bible Translation Progress</div>
        {descendantIds.length > 1 && (
          <label className='text-xs flex items-center gap-2'>
            <input
              type='checkbox'
              checked={showDescendants}
              onChange={e => setShowDescendants(e.target.checked)}
            />
            Include descendant languages
          </label>
        )}
      </div>

      <div className='space-y-3'>
        {/* Audio Progress */}
        <div className='rounded-lg border border-neutral-200 dark:border-neutral-800 p-3'>
          <div className='text-sm font-medium mb-2'>Audio</div>
          <div className='flex items-center gap-4'>
            <ProgressRing value={audioProgress} />
            <div className='text-sm text-neutral-500'>Progress</div>
          </div>
          <div className='mt-3 overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='text-left text-neutral-500'>
                  <th className='py-1 pr-3'>Version</th>
                  <th className='py-1 pr-3'>Books</th>
                  <th className='py-1 pr-3'>Chapters</th>
                  <th className='py-1'>Verses</th>
                </tr>
              </thead>
              <tbody>
                {audioVersions.data?.map(v => (
                  <tr
                    key={v.id}
                    className='border-t border-neutral-200 dark:border-neutral-800'
                  >
                    <td className='py-1 pr-3'>{v.name}</td>
                    <td className='py-1 pr-3'>
                      {v.books_complete ?? 0} / {v.books_total ?? 0}
                    </td>
                    <td className='py-1 pr-3'>
                      {v.chapters_complete ?? 0} / {v.chapters_total ?? 0}
                    </td>
                    <td className='py-1'>
                      {v.verses_complete ?? 0} / {v.verses_total ?? 0}
                    </td>
                  </tr>
                ))}
                {audioVersions.data?.length === 0 && (
                  <tr>
                    <td className='py-2 text-neutral-500' colSpan={4}>
                      No audio versions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Text Progress */}
        <div className='rounded-lg border border-neutral-200 dark:border-neutral-800 p-3'>
          <div className='text-sm font-medium mb-2'>Text</div>
          <div className='flex items-center gap-4'>
            <ProgressRing value={textProgress} />
            <div className='text-sm text-neutral-500'>Progress</div>
          </div>
          <div className='mt-3 overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='text-left text-neutral-500'>
                  <th className='py-1 pr-3'>Version</th>
                  <th className='py-1 pr-3'>Books</th>
                  <th className='py-1 pr-3'>Chapters</th>
                  <th className='py-1'>Verses</th>
                </tr>
              </thead>
              <tbody>
                {textVersions.data?.map(v => (
                  <tr
                    key={v.id}
                    className='border-t border-neutral-200 dark:border-neutral-800'
                  >
                    <td className='py-1 pr-3'>{v.name}</td>
                    <td className='py-1 pr-3'>
                      {v.books_complete ?? 0} / {v.books_total ?? 0}
                    </td>
                    <td className='py-1 pr-3'>
                      {v.chapters_complete ?? 0} / {v.chapters_total ?? 0}
                    </td>
                    <td className='py-1'>
                      {v.verses_complete ?? 0} / {v.verses_total ?? 0}
                    </td>
                  </tr>
                ))}
                {textVersions.data?.length === 0 && (
                  <tr>
                    <td className='py-2 text-neutral-500' colSpan={4}>
                      No text versions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
