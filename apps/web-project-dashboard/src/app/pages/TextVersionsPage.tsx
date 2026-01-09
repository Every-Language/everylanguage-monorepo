import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, FileText, Trash2 } from 'lucide-react';
import { useProjectFromRoute } from '../../features/dashboard/hooks/useProjectFromRoute';
import {
  useTextVersionsByProject,
  useCreateTextVersion,
  type TextVersion,
} from '../../shared/hooks/query/text-versions';
import { useBibleVersionsQuery } from '../../shared/hooks/query/bible-versions';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { Button } from '../../shared/design-system/components/Button';
import { Card, CardContent } from '../../shared/design-system/components/Card';
import { Input } from '../../shared/design-system/components/Input';
import { LoadingSpinner } from '../../shared/design-system/components/LoadingSpinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../shared/design-system/components/Dialog';
import {
  Select,
  SelectItem,
} from '../../shared/design-system/components/Select';
import { formatDistanceToNow } from 'date-fns';

export const TextVersionsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { project, isLoading: projectLoading } = useProjectFromRoute();
  const { user } = useAuth();

  const { data: textVersions = [], isLoading: versionsLoading } =
    useTextVersionsByProject(projectId || null);
  const { data: bibleVersions = [] } = useBibleVersionsQuery();

  const createMutation = useCreateTextVersion();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [selectedBibleVersionId, setSelectedBibleVersionId] = useState('');
  const [textVersionSource, setTextVersionSource] = useState<
    'official_translation' | 'ai_transcription' | 'user_submitted'
  >('user_submitted');

  const isLoading = projectLoading || versionsLoading;

  const handleCreateVersion = async () => {
    if (!newVersionName.trim() || !selectedBibleVersionId || !project) return;

    try {
      await createMutation.mutateAsync({
        name: newVersionName.trim(),
        language_entity_id: project.target_language_entity_id,
        bible_version_id: selectedBibleVersionId,
        text_version_source: textVersionSource,
        created_by: user?.id,
      });
      setShowCreateModal(false);
      setNewVersionName('');
      setSelectedBibleVersionId('');
      setTextVersionSource('user_submitted');
    } catch (error) {
      console.error('Failed to create text version:', error);
    }
  };

  const handleOpenVersion = (version: TextVersion) => {
    navigate(`/project/${projectId}/text-versions/${version.id}`);
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <LoadingSpinner size='lg' />
      </div>
    );
  }

  if (!project) {
    return (
      <div className='p-8'>
        <Card>
          <CardContent className='py-12 text-center'>
            <h3 className='text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2'>
              Project Not Found
            </h3>
            <p className='text-neutral-600 dark:text-neutral-400'>
              The project you're looking for doesn't exist or you don't have
              access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'official_translation':
        return 'Official Translation';
      case 'ai_transcription':
        return 'AI Transcription';
      case 'user_submitted':
        return 'User Submitted';
      default:
        return source;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'official_translation':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'ai_transcription':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'user_submitted':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400';
    }
  };

  return (
    <div className='p-6 space-y-5'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
            Text Versions
          </h1>
          <p className='text-sm text-neutral-600 dark:text-neutral-400 mt-0.5'>
            Manage Bible text versions for {project.name}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          size='sm'
          leftIcon={<Plus className='w-4 h-4' />}>
          New Text Version
        </Button>
      </div>

      {/* Versions Grid */}
      {textVersions.length === 0 ? (
        <Card>
          <CardContent className='py-8 text-center'>
            <div className='w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3'>
              <FileText className='w-6 h-6 text-neutral-400' />
            </div>
            <h3 className='text-base font-medium text-neutral-900 dark:text-neutral-100 mb-1.5'>
              No Text Versions Yet
            </h3>
            <p className='text-sm text-neutral-600 dark:text-neutral-400 mb-4 max-w-md mx-auto'>
              Create your first text version to start managing Bible text
              content.
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              size='sm'
              leftIcon={<Plus className='w-4 h-4' />}>
              Create Text Version
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {textVersions.map(version => {
            const bibleVersion = bibleVersions.find(
              bv => bv.id === version.bible_version_id
            );

            return (
              <Card
                key={version.id}
                className='group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-accent-300 dark:hover:border-accent-700'
                onClick={() => handleOpenVersion(version)}>
                <CardContent className='p-4'>
                  <div className='flex items-start justify-between mb-3'>
                    <div className='flex items-center gap-2.5'>
                      <div className='w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center'>
                        <FileText className='w-4 h-4 text-white' />
                      </div>
                      <div>
                        <h3 className='text-sm font-semibold text-neutral-900 dark:text-white group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors'>
                          {version.name}
                        </h3>
                        {bibleVersion && (
                          <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                            {bibleVersion.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      variant='ghost'
                      size='sm'
                      className='opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-7 w-7 p-0'
                      onClick={e => {
                        e.stopPropagation();
                        // TODO: Implement delete
                      }}
                      title='Delete version'>
                      <Trash2 className='w-3.5 h-3.5' />
                    </Button>
                  </div>

                  {/* Source Badge */}
                  {version.text_version_source && (
                    <div className='mb-3'>
                      <span
                        className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full ${getSourceColor(
                          version.text_version_source
                        )}`}>
                        {getSourceLabel(version.text_version_source)}
                      </span>
                    </div>
                  )}

                  <div className='flex items-center justify-between'>
                    <span className='text-[10px] text-neutral-400'>
                      {version.created_at && (
                        <>
                          Created{' '}
                          {formatDistanceToNow(new Date(version.created_at), {
                            addSuffix: true,
                          })}
                        </>
                      )}
                    </span>
                    <span className='text-[10px] text-accent-600 dark:text-accent-400 opacity-0 group-hover:opacity-100 transition-opacity'>
                      Open →
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Text Version</DialogTitle>
            <DialogDescription>
              Create a new text version to organize your Bible text content
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Version Name
              </label>
              <Input
                placeholder='e.g., Standard Translation 2024'
                value={newVersionName}
                onChange={e => setNewVersionName(e.target.value)}
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Bible Version
              </label>
              <Select
                value={selectedBibleVersionId}
                onValueChange={setSelectedBibleVersionId}>
                {bibleVersions.map(bv => (
                  <SelectItem key={bv.id} value={bv.id}>
                    {bv.name}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Source Type
              </label>
              <Select
                value={textVersionSource}
                onValueChange={value =>
                  setTextVersionSource(
                    value as
                      | 'official_translation'
                      | 'ai_transcription'
                      | 'user_submitted'
                  )
                }>
                <SelectItem value='official_translation'>
                  Official Translation
                </SelectItem>
                <SelectItem value='ai_transcription'>
                  AI Transcription
                </SelectItem>
                <SelectItem value='user_submitted'>User Submitted</SelectItem>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateVersion}
              disabled={
                !newVersionName.trim() ||
                !selectedBibleVersionId ||
                createMutation.isPending
              }>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
