import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { versionsApi } from '../api/versionsApi';
import { downloadService } from '@/shared/services/downloadService';
import { supabase } from '@/shared/services/supabase';
import {
  X,
  Edit,
  Save,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import type { Database } from '@everylanguage/shared-types';
import { Select, SelectItem } from '@everylanguage/shared-ui';

interface ViewAudioVersionModalProps {
  audioVersionId: string;
  onClose: () => void;
}

type CheckStatus = Database['public']['Enums']['check_status'];
type PublishStatus = Database['public']['Enums']['publish_status'];

export function ViewAudioVersionModal({
  audioVersionId,
  onClose,
}: ViewAudioVersionModalProps) {
  const queryClient = useQueryClient();
  const [isEntering, setIsEntering] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [checkStatusFilter, setCheckStatusFilter] = useState<string>('all');
  const [publishStatusFilter, setPublishStatusFilter] = useState<string>('all');
  const [bookSearch, setBookSearch] = useState('');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<
    'chapter_id' | 'version' | 'check_status' | 'publish_status'
  >('chapter_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  // Fetch audio version
  const { data: audioVersion, isLoading } = useQuery({
    queryKey: ['audio-version', audioVersionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audio_versions')
        .select('*')
        .eq('id', audioVersionId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Sync form state with audio version data
  useEffect(() => {
    if (audioVersion) {
      setName(audioVersion.name);
    }
  }, [audioVersion]);

  // Fetch books for search
  const { data: bookSearchResults = [] } = useQuery({
    queryKey: ['books-search', bookSearch],
    queryFn: async () => {
      if (!bookSearch || bookSearch.length < 2) return [];
      const { data, error } = await supabase
        .from('books')
        .select('id, name')
        .ilike('name', `%${bookSearch}%`)
        .order('global_order', { ascending: true })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: bookSearch.length >= 2,
  });

  // Fetch selected books to display their names
  const { data: selectedBooks = [] } = useQuery({
    queryKey: ['books-by-ids', selectedBookIds.join(',')],
    queryFn: async () => {
      if (selectedBookIds.length === 0) return [];
      const { data, error } = await supabase
        .from('books')
        .select('id, name')
        .in('id', selectedBookIds)
        .order('global_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: selectedBookIds.length > 0,
  });

  // Fetch media files
  const { data: mediaFilesResponse, isLoading: isLoadingMediaFiles } = useQuery(
    {
      queryKey: [
        'media-files',
        audioVersionId,
        page,
        pageSize,
        checkStatusFilter,
        publishStatusFilter,
        selectedBookIds.join(','),
        sortField,
        sortDirection,
      ],
      queryFn: () =>
        versionsApi.fetchMediaFilesByVersion(audioVersionId, {
          page,
          pageSize,
          checkStatusFilter:
            checkStatusFilter !== 'all'
              ? (checkStatusFilter as CheckStatus)
              : undefined,
          publishStatusFilter:
            publishStatusFilter !== 'all'
              ? (publishStatusFilter as PublishStatus)
              : undefined,
          bookIds: selectedBookIds.length > 0 ? selectedBookIds : undefined,
          sortField,
          sortDirection,
        }),
      enabled: !!audioVersionId,
    }
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsEntering(false);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  // Update name mutation
  const updateNameMutation = useMutation({
    mutationFn: async () => {
      await versionsApi.updateAudioVersionName(audioVersionId, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['audio-version', audioVersionId],
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingName(false);
    },
  });

  const handleSave = () => {
    updateNameMutation.mutate();
  };

  const handleSort = (
    field: 'chapter_id' | 'version' | 'check_status' | 'publish_status'
  ) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const getSortIndicator = (
    field: 'chapter_id' | 'version' | 'check_status' | 'publish_status'
  ) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getCheckStatusBadgeColor = (status: CheckStatus | null): string => {
    if (!status) {
      return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
    }
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
    }
  };

  const getPublishStatusBadgeColor = (status: PublishStatus): string => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'archived':
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
    }
  };

  const handleDownload = async (mediaFileId: string, filename: string) => {
    setDownloadingIds(prev => new Set(prev).add(mediaFileId));
    try {
      const response = await downloadService.getDownloadUrlsById({
        mediaFileIds: [mediaFileId],
      });

      if (response.media && response.media[mediaFileId]) {
        await downloadService.downloadFile(
          response.media[mediaFileId],
          filename || 'download'
        );
      } else {
        throw new Error('Download URL not found');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(mediaFileId);
        return next;
      });
    }
  };

  const getChapterDisplayName = (mediaFile: {
    chapter?: {
      chapter_number: number;
      book?: { name: string };
    } | null;
  }): string => {
    if (!mediaFile.chapter) return '—';
    const bookName = mediaFile.chapter.book?.name || 'Unknown';
    return `${bookName} ${mediaFile.chapter.chapter_number}`;
  };

  if (isLoading) {
    return (
      <div className='fixed inset-0 z-50 overflow-hidden'>
        <div className='absolute inset-0 bg-black bg-opacity-50' />
        <div className='absolute inset-y-0 right-0 max-w-4xl w-full bg-white dark:bg-neutral-900 shadow-xl flex items-center justify-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500'></div>
        </div>
      </div>
    );
  }

  if (!audioVersion) {
    return (
      <div className='fixed inset-0 z-50 overflow-hidden'>
        <div
          className='absolute inset-0 bg-black bg-opacity-50'
          onClick={handleClose}
        />
        <div className='absolute inset-y-0 right-0 max-w-4xl w-full bg-white dark:bg-neutral-900 shadow-xl flex items-center justify-center'>
          <p className='text-neutral-500 dark:text-neutral-400'>
            Audio version not found
          </p>
        </div>
      </div>
    );
  }

  const mediaFiles = mediaFilesResponse?.data || [];
  const totalCount = mediaFilesResponse?.count || 0;
  const totalPages = mediaFilesResponse?.totalPages || 1;

  return (
    <div className='fixed inset-0 z-50 overflow-hidden'>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ease-out ${
          isExiting ? 'opacity-0' : isEntering ? 'opacity-0' : 'opacity-50'
        }`}
        onClick={handleClose}
      />

      {/* Slide panel */}
      <div
        className={`absolute inset-y-0 right-0 max-w-4xl w-full bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          isExiting
            ? 'translate-x-full'
            : isEntering
              ? 'translate-x-full'
              : 'translate-x-0'
        }`}>
        {/* Header */}
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              {audioVersion.name}
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              Audio Version Details
            </p>
          </div>
          <button
            onClick={handleClose}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'>
            <X className='h-5 w-5 text-neutral-600 dark:text-neutral-400' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-8'>
          {/* Name Section */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Name
              </h3>
              {!editingName && (
                <button
                  onClick={() => setEditingName(true)}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
                  <Edit className='h-4 w-4' />
                  Edit
                </button>
              )}
            </div>
            <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              {editingName ? (
                <div className='flex items-center gap-2'>
                  <input
                    type='text'
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className='flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  />
                  <button
                    onClick={handleSave}
                    disabled={updateNameMutation.isPending}
                    className='px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'>
                    <Save className='h-4 w-4' />
                    {updateNameMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setName(audioVersion.name);
                    }}
                    className='px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
                    Cancel
                  </button>
                </div>
              ) : (
                <p className='text-neutral-900 dark:text-neutral-100'>
                  {audioVersion.name}
                </p>
              )}
            </div>
          </section>

          {/* Media Files Table */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Media Files
              </h3>
            </div>

            {/* Filters */}
            <div className='mb-4 grid grid-cols-1 md:grid-cols-3 gap-4'>
              <Select
                label='Check Status'
                value={checkStatusFilter}
                onValueChange={value => {
                  setCheckStatusFilter(value);
                  setPage(1);
                }}>
                <SelectItem value='all'>All statuses</SelectItem>
                <SelectItem value='pending'>Pending</SelectItem>
                <SelectItem value='approved'>Approved</SelectItem>
                <SelectItem value='rejected'>Rejected</SelectItem>
              </Select>

              <Select
                label='Publish Status'
                value={publishStatusFilter}
                onValueChange={value => {
                  setPublishStatusFilter(value);
                  setPage(1);
                }}>
                <SelectItem value='all'>All statuses</SelectItem>
                <SelectItem value='draft'>Draft</SelectItem>
                <SelectItem value='pending'>Pending</SelectItem>
                <SelectItem value='published'>Published</SelectItem>
              </Select>

              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Book
                </label>
                <div className='relative'>
                  <input
                    type='text'
                    placeholder='Search books...'
                    value={bookSearch}
                    onChange={e => setBookSearch(e.target.value)}
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
                  />
                  {bookSearch.length >= 2 && (
                    <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                      {bookSearchResults.length === 0 ? (
                        <div className='px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                          No matches
                        </div>
                      ) : (
                        bookSearchResults.map(book => (
                          <button
                            key={book.id}
                            type='button'
                            onClick={() => {
                              if (!selectedBookIds.includes(book.id)) {
                                setSelectedBookIds(prev => [...prev, book.id]);
                                setPage(1);
                              }
                              setBookSearch('');
                            }}
                            className='w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                            {book.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {selectedBooks.length > 0 && (
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {selectedBooks.map(book => (
                      <span
                        key={book.id}
                        className='inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'>
                        {book.name}
                        <button
                          type='button'
                          onClick={() => {
                            setSelectedBookIds(prev =>
                              prev.filter(id => id !== book.id)
                            );
                            setPage(1);
                          }}
                          className='text-xs hover:underline'>
                          Remove
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
              {isLoadingMediaFiles ? (
                <div className='p-8 text-center'>
                  <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
                  <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
                    Loading media files...
                  </p>
                </div>
              ) : (
                <>
                  <div className='overflow-x-auto'>
                    <table
                      className='w-full divide-y divide-neutral-200 dark:divide-neutral-800'
                      style={{ tableLayout: 'fixed' }}>
                      <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                        <tr>
                          <th
                            className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'
                            style={{ width: '25%' }}>
                            <button
                              type='button'
                              onClick={() => handleSort('chapter_id')}
                              className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                              Chapter
                              <span>{getSortIndicator('chapter_id')}</span>
                            </button>
                          </th>
                          <th
                            className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'
                            style={{ width: '15%' }}>
                            <button
                              type='button'
                              onClick={() => handleSort('version')}
                              className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                              Version
                              <span>{getSortIndicator('version')}</span>
                            </button>
                          </th>
                          <th
                            className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'
                            style={{ width: '20%' }}>
                            <button
                              type='button'
                              onClick={() => handleSort('check_status')}
                              className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                              Check Status
                              <span>{getSortIndicator('check_status')}</span>
                            </button>
                          </th>
                          <th
                            className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'
                            style={{ width: '20%' }}>
                            <button
                              type='button'
                              onClick={() => handleSort('publish_status')}
                              className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                              Publish Status
                              <span>{getSortIndicator('publish_status')}</span>
                            </button>
                          </th>
                          <th
                            className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'
                            style={{ width: '20%' }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                        {mediaFiles.length > 0 ? (
                          mediaFiles.map(mediaFile => (
                            <tr
                              key={mediaFile.id}
                              className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors'>
                              <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
                                {getChapterDisplayName(mediaFile)}
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                                {mediaFile.version}
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-sm'>
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${getCheckStatusBadgeColor(
                                    mediaFile.check_status
                                  )}`}>
                                  {mediaFile.check_status || '—'}
                                </span>
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-sm'>
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPublishStatusBadgeColor(
                                    mediaFile.publish_status
                                  )}`}>
                                  {mediaFile.publish_status}
                                </span>
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-sm'>
                                <button
                                  onClick={() =>
                                    handleDownload(
                                      mediaFile.id,
                                      `${getChapterDisplayName(mediaFile)}.mp3`
                                    )
                                  }
                                  disabled={downloadingIds.has(mediaFile.id)}
                                  className='inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                                  <Download className='h-3 w-3' />
                                  {downloadingIds.has(mediaFile.id)
                                    ? 'Downloading...'
                                    : 'Download'}
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'>
                              No media files found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className='mt-4 flex items-center justify-between px-6 py-3 border-t border-neutral-200 dark:border-neutral-800'>
                      <div className='text-sm text-neutral-600 dark:text-neutral-400'>
                        Page {page} of {totalPages} (
                        {totalCount.toLocaleString()} total)
                      </div>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                          <ChevronLeft className='h-4 w-4' />
                        </button>
                        <span className='text-sm text-neutral-600 dark:text-neutral-400 min-w-[100px] text-center'>
                          {((page - 1) * pageSize + 1).toLocaleString()} -{' '}
                          {Math.min(
                            page * pageSize,
                            totalCount
                          ).toLocaleString()}
                        </span>
                        <button
                          onClick={() =>
                            setPage(p => Math.min(totalPages, p + 1))
                          }
                          disabled={page === totalPages}
                          className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                          <ChevronRight className='h-4 w-4' />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
