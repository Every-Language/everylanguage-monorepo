import React, { useState, useMemo, useEffect } from 'react';
import { Search, Globe, MapPin, FolderOpen, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '../../shared/design-system/components/Input';
import { Button } from '../../shared/design-system/components/Button';
import { LoadingSpinner } from '../../shared/design-system';
import { LandingNavbar } from '../../features/landing-page/components/LandingNavbar';
import { supabase } from '../../shared/services/supabase';
import { LandingFooter } from '@/features/landing-page';
import { useProjectsSearch } from '../../shared/hooks/query/projects';

interface LanguageWithProject {
  id: string;
  motherTongue: string;
  country: string;
  projectName: string;
  projectId: string;
  newTestament: number;
  oldTestament: number;
  totalProgress: number;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Hook to fetch ALL projects (public view) with their language entities and translation progress
function useAllProjectsWithLanguages() {
  return useQuery({
    queryKey: ['all-projects-with-languages-public'],
    queryFn: async () => {
      // Fetch ALL projects with their target language entity and region
      // This is a public view - fetches all projects regardless of user
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(
          `
          id,
          name,
          target_language_entity_id,
          region_id,
          publish_status,
          target_language:language_entities!target_language_entity_id (
            id,
            name,
            level
          ),
          region:regions!region_id (
            id,
            name,
            level
          )
        `
        )
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      if (!projects || projects.length === 0) return [];

      // Get all project IDs
      const projectIds = projects.map(p => p.id);

      // Fetch audio versions for all projects
      const { data: audioVersions, error: audioError } = await supabase
        .from('audio_versions')
        .select('id, project_id')
        .in('project_id', projectIds);

      if (audioError) throw audioError;

      // Group audio versions by project
      const audioVersionsByProject = new Map<string, string[]>();
      audioVersions?.forEach(av => {
        if (av.project_id) {
          if (!audioVersionsByProject.has(av.project_id)) {
            audioVersionsByProject.set(av.project_id, []);
          }
          audioVersionsByProject.get(av.project_id)!.push(av.id);
        }
      });

      // Get all audio version IDs
      const allAudioVersionIds = audioVersions?.map(av => av.id) || [];

      // Fetch media files with their chapter and book info to calculate translation progress
      let mediaFilesWithBooks: Array<{
        audio_version_id: string;
        chapter_id: string;
        chapters: {
          book_id: string;
          books: {
            id: string;
            testament: string | null;
          } | null;
        } | null;
      }> = [];

      if (allAudioVersionIds.length > 0) {
        const { data: mediaFiles, error: mediaError } = await supabase
          .from('media_files')
          .select(
            `
            audio_version_id,
            chapter_id,
            chapters!inner (
              book_id,
              books!inner (
                id,
                testament
              )
            )
          `
          )
          .in('audio_version_id', allAudioVersionIds)
          .not('chapter_id', 'is', null);

        if (mediaError) throw mediaError;
        mediaFilesWithBooks = (mediaFiles || []) as typeof mediaFilesWithBooks;
      }

      // Calculate translation progress per project
      const progressByProject = new Map<
        string,
        { nt: Set<string>; ot: Set<string> }
      >();

      mediaFilesWithBooks.forEach(mf => {
        // Find which project this audio version belongs to
        let projectId: string | null = null;
        for (const [pId, avIds] of audioVersionsByProject.entries()) {
          if (avIds.includes(mf.audio_version_id)) {
            projectId = pId;
            break;
          }
        }

        if (projectId && mf.chapters?.books) {
          if (!progressByProject.has(projectId)) {
            progressByProject.set(projectId, { nt: new Set(), ot: new Set() });
          }

          const progress = progressByProject.get(projectId)!;
          const bookId = mf.chapters.books.id;
          const testament = mf.chapters.books.testament;

          if (testament === 'NT') {
            progress.nt.add(bookId);
          } else if (testament === 'OT') {
            progress.ot.add(bookId);
          }
        }
      });

      // Transform projects to table rows
      const allProjectRows = projects.map(project => {
        const progress = progressByProject.get(project.id);
        const targetLang = project.target_language as {
          id: string;
          name: string;
          level: string;
        } | null;
        const region = project.region as {
          id: string;
          name: string;
          level: string;
        } | null;

        return {
          id: project.id,
          motherTongue: targetLang?.name || 'Unknown',
          country: region?.name || 'Unknown',
          projectName: project.name,
          projectId: project.id,
          newTestament: progress?.nt.size || 0,
          oldTestament: progress?.ot.size || 0,
          totalProgress: (progress?.nt.size || 0) + (progress?.ot.size || 0),
        };
      });

      // Sort by total translation progress (most progress first), then by name
      allProjectRows.sort((a, b) => {
        if (b.totalProgress !== a.totalProgress) {
          return b.totalProgress - a.totalProgress;
        }
        return a.projectName.localeCompare(b.projectName);
      });

      return allProjectRows;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to fetch translation progress for specific project IDs (used for search results)
function useProjectsProgressByIds(projectIds: string[]) {
  return useQuery({
    queryKey: ['projects-progress-by-ids', projectIds],
    queryFn: async (): Promise<Map<string, { nt: number; ot: number }>> => {
      if (projectIds.length === 0) return new Map();

      // Fetch audio versions for these projects
      const { data: audioVersions, error: audioError } = await supabase
        .from('audio_versions')
        .select('id, project_id')
        .in('project_id', projectIds);

      if (audioError) throw audioError;
      if (!audioVersions || audioVersions.length === 0) return new Map();

      // Group audio versions by project
      const audioVersionsByProject = new Map<string, string[]>();
      audioVersions.forEach(av => {
        if (av.project_id) {
          if (!audioVersionsByProject.has(av.project_id)) {
            audioVersionsByProject.set(av.project_id, []);
          }
          audioVersionsByProject.get(av.project_id)!.push(av.id);
        }
      });

      // Get all audio version IDs
      const allAudioVersionIds = audioVersions.map(av => av.id);

      // Fetch media files with book/testament info
      const { data: mediaFiles, error: mediaError } = await supabase
        .from('media_files')
        .select(
          `
          audio_version_id,
          chapter_id,
          chapters!inner (
            book_id,
            books!inner (
              id,
              testament
            )
          )
        `
        )
        .in('audio_version_id', allAudioVersionIds)
        .not('chapter_id', 'is', null);

      if (mediaError) throw mediaError;

      // Calculate progress per project
      const progressByProject = new Map<
        string,
        { nt: Set<string>; ot: Set<string> }
      >();

      type MediaFileWithBooks = {
        audio_version_id: string;
        chapter_id: string;
        chapters: {
          book_id: string;
          books: { id: string; testament: string | null } | null;
        } | null;
      };

      (mediaFiles as MediaFileWithBooks[] | null)?.forEach(mf => {
        let projectId: string | null = null;
        for (const [pId, avIds] of audioVersionsByProject.entries()) {
          if (avIds.includes(mf.audio_version_id)) {
            projectId = pId;
            break;
          }
        }

        if (projectId && mf.chapters?.books) {
          if (!progressByProject.has(projectId)) {
            progressByProject.set(projectId, { nt: new Set(), ot: new Set() });
          }

          const progress = progressByProject.get(projectId)!;
          const bookId = mf.chapters.books.id;
          const testament = mf.chapters.books.testament;

          if (testament === 'NT') {
            progress.nt.add(bookId);
          } else if (testament === 'OT') {
            progress.ot.add(bookId);
          }
        }
      });

      // Convert to final format
      const result = new Map<string, { nt: number; ot: number }>();
      for (const projectId of projectIds) {
        const progress = progressByProject.get(projectId);
        result.set(projectId, {
          nt: progress?.nt.size || 0,
          ot: progress?.ot.size || 0,
        });
      }

      return result;
    },
    enabled: projectIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook to fetch region names for specific project IDs (used for search results)
function useProjectsRegionsByIds(projectIds: string[]) {
  return useQuery({
    queryKey: ['projects-regions-by-ids', projectIds],
    queryFn: async (): Promise<Map<string, string>> => {
      if (projectIds.length === 0) return new Map();

      const { data: projects, error } = await supabase
        .from('projects')
        .select(
          `
          id,
          region:regions!region_id (
            name
          )
        `
        )
        .in('id', projectIds);

      if (error) throw error;

      const result = new Map<string, string>();
      projects?.forEach(p => {
        const region = p.region as { name: string } | null;
        result.set(p.id, region?.name || 'Unknown');
      });

      return result;
    },
    enabled: projectIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export const LanguagesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Debounce search query for server-side search (1 second delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 1000);
  const isSearching = debouncedSearchQuery.trim().length >= 2;

  // Fetch ALL projects with languages (public view) - used when not searching
  const { data: allProjects = [], isLoading: isLoadingAll } =
    useAllProjectsWithLanguages();

  // Server-side fuzzy search using search_projects RPC
  const {
    data: searchResults = [],
    isLoading: isSearchLoading,
    isError: isSearchError,
  } = useProjectsSearch(debouncedSearchQuery, {
    maxResults: 50,
    minSimilarity: 0.1,
    enabled: isSearching,
  });

  // Hook to fetch progress data for search results
  const searchResultIds = useMemo(
    () => searchResults.map(r => r.project_id),
    [searchResults]
  );

  const { data: searchProgressData = new Map() } =
    useProjectsProgressByIds(searchResultIds);

  // Hook to fetch region data for search results
  const { data: searchRegionData = new Map() } =
    useProjectsRegionsByIds(searchResultIds);

  // Transform search results to table format with progress data
  const searchTableData: LanguageWithProject[] = useMemo(() => {
    if (!isSearching || searchResults.length === 0) return [];

    return searchResults.map(result => {
      const progress = searchProgressData.get(result.project_id);
      const region = searchRegionData.get(result.project_id);

      return {
        id: result.project_id,
        motherTongue: result.target_language_name,
        country: region || 'Unknown',
        projectName: result.project_name,
        projectId: result.project_id,
        newTestament: progress?.nt || 0,
        oldTestament: progress?.ot || 0,
        totalProgress: (progress?.nt || 0) + (progress?.ot || 0),
      };
    });
  }, [searchResults, searchProgressData, searchRegionData, isSearching]);

  // Determine which data to show
  const tableData: LanguageWithProject[] = useMemo(() => {
    // If searching, use server-side search results
    if (isSearching) {
      return searchTableData;
    }

    // Otherwise, use all projects with optional limit
    if (!showAll) {
      return allProjects.slice(0, 10);
    }

    return allProjects;
  }, [isSearching, searchTableData, allProjects, showAll]);

  const isLoading = isSearching ? isSearchLoading : isLoadingAll;
  const hasMoreProjects = !isSearching && !showAll && allProjects.length > 10;

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
            {isSearchLoading && isSearching ? (
              <Loader2 className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-accent-500 animate-spin' />
            ) : (
              <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400' />
            )}
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder='Search by language name, country, or project name...'
              className='pl-12 h-14 text-lg rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg shadow-neutral-200/50 dark:shadow-none focus:border-accent-500 dark:focus:border-accent-400'
            />
          </div>
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className='text-sm text-neutral-500 dark:text-neutral-400 mt-2 text-center'>
              Type at least 2 characters to search
            </p>
          )}
          {isSearchError && (
            <p className='text-sm text-red-500 dark:text-red-400 mt-2 text-center'>
              Search failed. Please try again.
            </p>
          )}
        </div>

        {/* Results Table */}
        <div className='bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl shadow-neutral-200/50 dark:shadow-none overflow-hidden'>
          {/* Table Header */}
          <div className='grid grid-cols-5 gap-4 px-6 py-4 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700'>
            <div className='flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider'>
              <Globe className='h-4 w-4 text-accent-500' />
              Mother Tongue
            </div>
            <div className='flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider'>
              <MapPin className='h-4 w-4 text-accent-500' />
              Country
            </div>
            <div className='flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider'>
              <FolderOpen className='h-4 w-4 text-accent-500' />
              Project
            </div>
            <div className='text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-center'>
              New Testament
            </div>
            <div className='text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-center'>
              Old Testament
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
                    : 'Projects will appear here once they are created'}
                </p>
              </div>
            ) : (
              tableData.map((row, index) => (
                <div
                  key={`${row.id}-${index}`}
                  className='grid grid-cols-5 gap-4 px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors'>
                  <div className='font-medium text-neutral-900 dark:text-white'>
                    {row.motherTongue}
                  </div>
                  <div className='text-neutral-600 dark:text-neutral-400'>
                    {row.country}
                  </div>
                  <div
                    className='text-neutral-600 dark:text-neutral-400 truncate'
                    title={row.projectName}>
                    {row.projectName}
                  </div>
                  <div className='text-center'>
                    <span
                      className={`inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-full text-sm font-semibold ${
                        row.newTestament > 0
                          ? row.newTestament === 27
                            ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                            : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500'
                      }`}>
                      {row.newTestament}/27
                    </span>
                  </div>
                  <div className='text-center'>
                    <span
                      className={`inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-full text-sm font-semibold ${
                        row.oldTestament > 0
                          ? row.oldTestament === 39
                            ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                            : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500'
                      }`}>
                      {row.oldTestament}/39
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Results Count and Show All Button */}
          {tableData.length > 0 && (
            <div className='px-6 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between'>
              <span className='text-sm text-neutral-600 dark:text-neutral-400'>
                {isSearching ? (
                  <>
                    Found {tableData.length} project
                    {tableData.length !== 1 ? 's' : ''} matching "
                    {debouncedSearchQuery}"
                  </>
                ) : (
                  <>
                    Showing {tableData.length}
                    {hasMoreProjects ? ` of ${allProjects.length}` : ''} project
                    {tableData.length !== 1 ? 's' : ''}
                    {!showAll &&
                      allProjects.length > 10 &&
                      ' (top 10 by progress)'}
                  </>
                )}
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
              {showAll && !isSearching && allProjects.length > 10 && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowAll(false)}
                  className='text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300'>
                  Show top 10 only
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
            The New Testament contains 27 books, and the Old Testament contains
            39 books. The numbers shown indicate how many books have been
            translated into each language. A complete Bible translation includes
            all 66 books.
          </p>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
};
