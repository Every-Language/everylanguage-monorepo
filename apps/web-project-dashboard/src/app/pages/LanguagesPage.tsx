import React, { useState, useMemo } from 'react';
import { Search, Globe, FolderOpen, BarChart3 } from 'lucide-react';
import { Input } from '../../shared/design-system/components/Input';
import { Button } from '../../shared/design-system/components/Button';
import { LoadingSpinner } from '../../shared/design-system';
import { LandingNavbar } from '../../features/landing-page/components/LandingNavbar';
import {
  useActiveProjectsWithProgress,
  type ActiveProjectWithProgress,
} from '../../shared/hooks/query/projects';
import { LandingFooter } from '@/features/landing-page';

interface LanguageRow {
  id: string;
  motherTongue: string;
  projectName: string;
  completedChapters: number;
  totalChapters: number;
  progressPercentage: number;
}

const TOP_N = 10;

function toLanguageRow(project: ActiveProjectWithProgress): LanguageRow {
  return {
    id: project.project_id,
    motherTongue: project.language_name ?? 'Unknown',
    projectName: project.project_name ?? 'Unknown project',
    completedChapters: project.completed_chapters ?? 0,
    totalChapters: project.total_chapters ?? 0,
    progressPercentage: Number(project.progress_percentage ?? 0),
  };
}

export const LanguagesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const { data: rpcData = [], isLoading } = useActiveProjectsWithProgress();

  const allProjects: LanguageRow[] = useMemo(
    () => rpcData.map(toLanguageRow),
    [rpcData]
  );

  const tableData: LanguageRow[] = useMemo(() => {
    let filtered = allProjects;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = allProjects.filter(
        project =>
          project.motherTongue.toLowerCase().includes(query) ||
          project.projectName.toLowerCase().includes(query)
      );
    }

    if (!searchQuery.trim() && !showAll) {
      return filtered.slice(0, TOP_N);
    }

    return filtered;
  }, [allProjects, searchQuery, showAll]);

  const hasMoreProjects =
    !searchQuery.trim() && !showAll && allProjects.length > TOP_N;

  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white'>
      {/* Background Gradients */}
      <div className='fixed inset-0 pointer-events-none overflow-hidden'>
        <div className='absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-200/20 dark:bg-primary-700/10 blur-[100px]' />
        <div className='absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent-200/20 dark:bg-accent-800/10 blur-[80px]' />
      </div>

      {/* Navbar */}
      <LandingNavbar />

      {/* Main Content */}
      <main className='relative z-10 max-w-6xl mx-auto px-4 py-8'>
        {/* Header */}
        <div className='text-center mb-10'>
          <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-100 dark:bg-accent-500/10 text-accent-700 dark:text-accent-400 text-sm font-medium mb-4'>
            <Globe className='h-4 w-4' />
            Language Explorer
          </div>
          <h1 className='text-4xl md:text-5xl font-bold tracking-tight mb-4'>
            Search{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-accent-500 to-accent-700 dark:from-accent-300 dark:to-accent-500'>
              Languages
            </span>
          </h1>
          <p className='text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto'>
            Discover Bible translation progress across thousands of languages
            and dialects worldwide.
          </p>
        </div>

        {/* Search Bar */}
        <div className='max-w-2xl mx-auto mb-10'>
          <div className='relative'>
            <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400' />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder='Search by language name or project name...'
              className='pl-12 h-14 text-lg rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg shadow-neutral-200/50 dark:shadow-none focus:border-accent-500 dark:focus:border-accent-400'
            />
          </div>
        </div>

        {/* Results Table */}
        <div className='bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl shadow-neutral-200/50 dark:shadow-none overflow-hidden'>
          {/* Table Header */}
          <div className='grid grid-cols-[1.25fr_1.75fr_1.5fr] gap-4 px-6 py-4 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700'>
            <div className='flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider'>
              <Globe className='h-4 w-4 text-accent-500' />
              Mother Tongue
            </div>
            <div className='flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider'>
              <FolderOpen className='h-4 w-4 text-accent-500' />
              Project
            </div>
            <div className='flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider justify-end'>
              <BarChart3 className='h-4 w-4 text-accent-500' />
              Progress
            </div>
          </div>

          {/* Table Body */}
          <div className='divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[600px] overflow-y-auto'>
            {isLoading ? (
              <div className='flex items-center justify-center py-16'>
                <LoadingSpinner size='lg' />
              </div>
            ) : tableData.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-16 text-neutral-500 dark:text-neutral-400'>
                <Globe className='h-12 w-12 mb-4 opacity-30' />
                <p className='text-lg font-medium'>
                  {searchQuery ? 'No languages found' : 'No projects available'}
                </p>
                <p className='text-sm'>
                  {searchQuery
                    ? 'Try a different search term or check the spelling'
                    : 'Active projects will appear here once they have translation progress'}
                </p>
              </div>
            ) : (
              tableData.map((row, index) => (
                <ProgressRow key={`${row.id}-${index}`} row={row} />
              ))
            )}
          </div>

          {/* Results Count and Show All Button */}
          {tableData.length > 0 && (
            <div className='px-6 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between'>
              <span className='text-sm text-neutral-600 dark:text-neutral-400'>
                Showing {tableData.length}
                {hasMoreProjects ? ` of ${allProjects.length}` : ''} project
                {tableData.length !== 1 ? 's' : ''}
                {searchQuery && ` matching "${searchQuery}"`}
                {!searchQuery &&
                  !showAll &&
                  allProjects.length > TOP_N &&
                  ` (top ${TOP_N} by progress)`}
              </span>
              {hasMoreProjects && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowAll(true)}
                  className='text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300'>
                  Show all {allProjects.length} projects
                </Button>
              )}
              {showAll && !searchQuery && allProjects.length > TOP_N && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowAll(false)}
                  className='text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300'>
                  Show top {TOP_N} only
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className='mt-16 mb-20 p-6 bg-gradient-to-br from-accent-50 to-primary-50 dark:from-accent-900/20 dark:to-primary-900/20 rounded-2xl border border-accent-200 dark:border-accent-800/30'>
          <h3 className='text-lg font-semibold text-neutral-900 dark:text-white mb-2'>
            About Translation Progress
          </h3>
          <p className='text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed'>
            Progress is measured at the chapter level across each project's
            audio and text versions. The number shown is the percentage of
            translated chapters out of the project's total chapter count, with
            chapters completed and total displayed alongside.
          </p>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
};

interface ProgressRowProps {
  row: LanguageRow;
}

const ProgressRow: React.FC<ProgressRowProps> = ({ row }) => {
  const pct = clampPercentage(row.progressPercentage);
  const tone = progressTone(pct);

  return (
    <div className='grid grid-cols-[1.25fr_1.75fr_1.5fr] gap-4 px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors items-center'>
      <div
        className='font-medium text-neutral-900 dark:text-white truncate'
        title={row.motherTongue}>
        {row.motherTongue}
      </div>
      <div
        className='text-neutral-600 dark:text-neutral-400 truncate'
        title={row.projectName}>
        {row.projectName}
      </div>
      <div className='flex items-center gap-3 justify-end'>
        <div
          className='hidden sm:block w-24 md:w-32 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden'
          aria-hidden='true'>
          <div className={`h-full ${tone.bar}`} style={{ width: `${pct}%` }} />
        </div>
        <span
          className={`inline-flex items-center justify-center min-w-[3.5rem] px-3 py-1 rounded-full text-sm font-semibold ${tone.chip}`}
          title={`${row.completedChapters} of ${row.totalChapters} chapters`}>
          {pct.toFixed(pct >= 100 || pct === 0 ? 0 : 1)}%
        </span>
      </div>
    </div>
  );
};

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

interface ProgressTone {
  bar: string;
  chip: string;
}

function progressTone(pct: number): ProgressTone {
  if (pct >= 100) {
    return {
      bar: 'bg-green-500 dark:bg-green-400',
      chip: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
    };
  }
  if (pct > 0) {
    return {
      bar: 'bg-amber-500 dark:bg-amber-400',
      chip: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
    };
  }
  return {
    bar: 'bg-neutral-300 dark:bg-neutral-700',
    chip: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500',
  };
}
