import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { versionsApi } from '../api/versionsApi';
import { supabase } from '@/shared/services/supabase';
import { X, Edit, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Database } from '@everylanguage/shared-types';
import { Select, SelectItem } from '@everylanguage/shared-ui';

interface ViewTextVersionModalProps {
  textVersionId: string;
  onClose: () => void;
}

type PublishStatus = Database['public']['Enums']['publish_status'];

export function ViewTextVersionModal({
  textVersionId,
  onClose,
}: ViewTextVersionModalProps) {
  const queryClient = useQueryClient();
  const [isEntering, setIsEntering] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [publishStatusFilter, setPublishStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<
    'verse_id' | 'version' | 'publish_status'
  >('verse_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fetch text version
  const { data: textVersion, isLoading } = useQuery({
    queryKey: ['text-version', textVersionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('text_versions')
        .select('*')
        .eq('id', textVersionId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Sync form state with text version data
  useEffect(() => {
    if (textVersion) {
      setName(textVersion.name);
    }
  }, [textVersion]);

  // Fetch verse texts
  const { data: verseTextsResponse, isLoading: isLoadingVerseTexts } = useQuery(
    {
      queryKey: [
        'verse-texts',
        textVersionId,
        page,
        pageSize,
        publishStatusFilter,
        sortField,
        sortDirection,
      ],
      queryFn: () =>
        versionsApi.fetchVerseTextsByVersion(textVersionId, {
          page,
          pageSize,
          publishStatusFilter:
            publishStatusFilter !== 'all'
              ? (publishStatusFilter as PublishStatus)
              : undefined,
          sortField,
          sortDirection,
        }),
      enabled: !!textVersionId,
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
      await versionsApi.updateTextVersionName(textVersionId, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['text-version', textVersionId],
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingName(false);
    },
  });

  const handleSave = () => {
    updateNameMutation.mutate();
  };

  const handleSort = (field: 'verse_id' | 'version' | 'publish_status') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const getSortIndicator = (
    field: 'verse_id' | 'version' | 'publish_status'
  ) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getPublishStatusBadgeColor = (status: PublishStatus): string => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'draft':
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
    }
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

  if (!textVersion) {
    return (
      <div className='fixed inset-0 z-50 overflow-hidden'>
        <div
          className='absolute inset-0 bg-black bg-opacity-50'
          onClick={handleClose}
        />
        <div className='absolute inset-y-0 right-0 max-w-4xl w-full bg-white dark:bg-neutral-900 shadow-xl flex items-center justify-center'>
          <p className='text-neutral-500 dark:text-neutral-400'>
            Text version not found
          </p>
        </div>
      </div>
    );
  }

  const verseTexts = verseTextsResponse?.data || [];
  const totalCount = verseTextsResponse?.count || 0;
  const totalPages = verseTextsResponse?.totalPages || 1;

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
        }`}
      >
        {/* Header */}
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              {textVersion.name}
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              Text Version Details
            </p>
          </div>
          <button
            onClick={handleClose}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
          >
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
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'
                >
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
                    className='px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'
                  >
                    <Save className='h-4 w-4' />
                    {updateNameMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setName(textVersion.name);
                    }}
                    className='px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <p className='text-neutral-900 dark:text-neutral-100'>
                  {textVersion.name}
                </p>
              )}
            </div>
          </section>

          {/* Verse Texts Table */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Verse Texts
              </h3>
            </div>

            {/* Filters */}
            <div className='mb-4'>
              <Select
                label='Publish Status'
                value={publishStatusFilter}
                onValueChange={value => {
                  setPublishStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectItem value='all'>All statuses</SelectItem>
                <SelectItem value='draft'>Draft</SelectItem>
                <SelectItem value='pending'>Pending</SelectItem>
                <SelectItem value='published'>Published</SelectItem>
              </Select>
            </div>

            {/* Table */}
            <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
              {isLoadingVerseTexts ? (
                <div className='p-8 text-center'>
                  <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
                  <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
                    Loading verse texts...
                  </p>
                </div>
              ) : (
                <>
                  <div className='overflow-x-auto'>
                    <table
                      className='w-full divide-y divide-neutral-200 dark:divide-neutral-800'
                      style={{ tableLayout: 'fixed' }}
                    >
                      <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                        <tr>
                          <th
                            className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'
                            style={{ width: '15%' }}
                          >
                            <button
                              type='button'
                              onClick={() => handleSort('verse_id')}
                              className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'
                            >
                              Verse ID
                              <span>{getSortIndicator('verse_id')}</span>
                            </button>
                          </th>
                          <th
                            className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'
                            style={{ width: '50%' }}
                          >
                            Verse Text
                          </th>
                          <th
                            className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'
                            style={{ width: '15%' }}
                          >
                            <button
                              type='button'
                              onClick={() => handleSort('version')}
                              className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'
                            >
                              Version
                              <span>{getSortIndicator('version')}</span>
                            </button>
                          </th>
                          <th
                            className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'
                            style={{ width: '20%' }}
                          >
                            <button
                              type='button'
                              onClick={() => handleSort('publish_status')}
                              className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'
                            >
                              Publish Status
                              <span>{getSortIndicator('publish_status')}</span>
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                        {verseTexts.length > 0 ? (
                          verseTexts.map(verseText => (
                            <tr
                              key={verseText.id}
                              className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors'
                            >
                              <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
                                {verseText.verse_id}
                              </td>
                              <td className='px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400 overflow-hidden text-ellipsis'>
                                {verseText.verse_text}
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                                {verseText.version}
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-sm'>
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPublishStatusBadgeColor(
                                    verseText.publish_status
                                  )}`}
                                >
                                  {verseText.publish_status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={4}
                              className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'
                            >
                              No verse texts found
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
                          className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                        >
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
                          className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                        >
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
