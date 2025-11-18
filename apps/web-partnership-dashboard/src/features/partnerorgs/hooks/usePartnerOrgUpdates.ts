import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export interface PartnerOrgUpdate {
  id: string;
  type: 'project_update' | 'bible_audio';
  timestamp: string;
  // Project update fields
  project_id?: string;
  project_name?: string;
  language_name?: string;
  title?: string;
  body?: string;
  media_keys?: string[];
  // Bible audio fields
  media_file_id?: string;
  book_name?: string;
  chapter_number?: number | null;
  audio_version_id?: string;
  object_key?: string;
  // Common fields
  project?: {
    id: string;
    name: string;
    language_entity?: {
      id: string;
      name: string;
    };
  } | null;
  media?: Array<{
    id: string;
    media_type: string;
    object_key: string;
    original_filename: string | null;
    caption: string | null;
  }>;
  creator?: {
    id: string;
    full_name: string | null;
  } | null;
}

export function usePartnerOrgUpdates(partnerOrgId: string) {
  return useQuery({
    queryKey: ['partner-org-updates', partnerOrgId],
    queryFn: async () => {
      // Get projects for this partner org
      const { data: projects } = await (supabase as any)
        .from('vw_partner_org_projects_via_donations')
        .select('project_id, language_entity_id')
        .eq('partner_org_id', partnerOrgId);

      const projectIds = projects?.map((p: any) => p.project_id) || [];
      const languageIds = [
        ...new Set(projects?.map((p: any) => p.language_entity_id) || []),
      ];

      // Handle empty projectIds array to avoid 400 error
      if (projectIds.length === 0) {
        return [];
      }

      // Fetch project updates
      const { data: updates, error: updatesError } = await (supabase as any)
        .from('project_updates')
        .select(
          `
          *,
          project:projects (
            id,
            name,
            target_language_entity_id,
            language_entity:language_entities (
              id,
              name
            )
          ),
          media:project_updates_media (
            id,
            media_type,
            object_key,
            original_filename,
            caption
          ),
          creator:users (
            id,
            full_name
          )
        `
        )
        .in('project_id', projectIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (updatesError) throw updatesError;

      // Fetch bible audio uploads directly from media_files
      let bibleAudioUploads: any[] = [];
      if (languageIds.length > 0) {
        try {
          const { data: uploads, error: uploadsError } = await (supabase as any)
            .from('media_files')
            .select(
              `
              id,
              language_entity_id,
              created_at,
              object_key,
              audio_version_id,
              language_entity:language_entities (
                id,
                name
              ),
              start_verse:verses!media_files_start_verse_id_fkey (
                chapter:chapters (
                  book:books (
                    name
                  ),
                  chapter_number
                )
              ),
              chapter:chapters!media_files_chapter_id_fkey (
                book:books (
                  name
                ),
                chapter_number
              )
            `
            )
            .in('language_entity_id', languageIds)
            .eq('media_type', 'audio')
            .eq('is_bible_audio', true)
            .eq('upload_status', 'completed')
            .eq('publish_status', 'published')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(50);

          if (!uploadsError && uploads) {
            bibleAudioUploads = uploads.map((upload: any) => {
              const languageEntity = Array.isArray(upload.language_entity)
                ? upload.language_entity[0]
                : upload.language_entity;
              const verse = Array.isArray(upload.start_verse)
                ? upload.start_verse[0]
                : upload.start_verse;
              const chapter = verse?.chapter
                ? Array.isArray(verse.chapter)
                  ? verse.chapter[0]
                  : verse.chapter
                : Array.isArray(upload.chapter)
                  ? upload.chapter[0]
                  : upload.chapter;
              const book = chapter?.book
                ? Array.isArray(chapter.book)
                  ? chapter.book[0]
                  : chapter.book
                : null;

              return {
                media_file_id: upload.id,
                language_name: languageEntity?.name,
                book_name: book?.name,
                chapter_number: chapter?.chapter_number,
                uploaded_at: upload.created_at,
                audio_version_id: upload.audio_version_id,
                object_key: upload.object_key,
              };
            });
          }
        } catch (err) {
          console.error('Error fetching bible audio uploads:', err);
        }
      }

      // Transform project updates
      const projectUpdates: PartnerOrgUpdate[] = (updates ?? []).map(
        (update: any) => {
          const project = Array.isArray(update.project)
            ? update.project[0]
            : update.project;
          const languageEntity = project?.language_entity
            ? Array.isArray(project.language_entity)
              ? project.language_entity[0]
              : project.language_entity
            : null;

          return {
            id: update.id,
            type: 'project_update' as const,
            timestamp: update.created_at,
            project_id: update.project_id,
            project_name: project?.name,
            language_name: languageEntity?.name,
            title: update.title,
            body: update.body,
            media_keys: Array.isArray(update.media)
              ? update.media.map((m: any) => m.object_key).filter(Boolean)
              : [],
            project,
            media: Array.isArray(update.media) ? update.media : [],
            creator: Array.isArray(update.creator)
              ? update.creator[0]
              : update.creator,
          };
        }
      );

      // Transform bible audio uploads
      const audioUpdates: PartnerOrgUpdate[] = bibleAudioUploads.map(
        (upload: any) => ({
          id: upload.media_file_id,
          type: 'bible_audio' as const,
          timestamp: upload.uploaded_at,
          language_name: upload.language_name,
          book_name: upload.book_name,
          chapter_number: upload.chapter_number,
          audio_version_id: upload.audio_version_id,
          object_key: upload.object_key,
        })
      );

      // Combine and sort by timestamp
      const combined = [...projectUpdates, ...audioUpdates].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return combined;
    },
    enabled: !!partnerOrgId,
  });
}
