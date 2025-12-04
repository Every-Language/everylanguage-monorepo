import { supabase } from '@/shared/services/supabase';
import type { Database } from '@everylanguage/shared-types';

export interface TextVersionWithProgress {
  id: string;
  name: string;
  project_id: string | null;
  language_entity_id: string;
  created_at: string | null;
  updated_at: string | null;
  progress: {
    complete_chapters: number;
    total_chapters: number;
    progress_percentage: number;
  } | null;
}

export interface AudioVersionWithProgress {
  id: string;
  name: string;
  project_id: string | null;
  language_entity_id: string;
  created_at: string | null;
  updated_at: string | null;
  progress: {
    chapters_with_audio: number;
    total_chapters: number;
    progress_percentage: number;
  } | null;
}

export interface AudioVersionPaginated extends AudioVersionWithProgress {
  project?: {
    id: string;
    name: string;
  } | null;
  language?: {
    id: string;
    name: string;
  } | null;
}

export interface TextVersionPaginated extends TextVersionWithProgress {
  project?: {
    id: string;
    name: string;
  } | null;
  language?: {
    id: string;
    name: string;
  } | null;
}

export interface VerseText {
  id: string;
  verse_id: string;
  verse_text: string;
  version: number;
  publish_status: Database['public']['Enums']['publish_status'];
  text_version_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MediaFile {
  id: string;
  chapter_id: string | null;
  version: number;
  check_status: Database['public']['Enums']['check_status'] | null;
  publish_status: Database['public']['Enums']['publish_status'];
  upload_status: Database['public']['Enums']['upload_status'];
  audio_version_id: string | null;
  chapter?: {
    id: string;
    chapter_number: number;
    book?: {
      id: string;
      name: string;
      global_order: number;
    };
  };
}

export const versionsApi = {
  /**
   * Fetch all text versions for a project
   */
  async fetchTextVersionsByProject(
    projectId: string
  ): Promise<TextVersionWithProgress[]> {
    const { data: textVersions, error } = await supabase
      .from('text_versions')
      .select(
        'id, name, project_id, language_entity_id, created_at, updated_at'
      )
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!textVersions || textVersions.length === 0) {
      return [];
    }

    // Fetch progress for all versions
    const versionIds = textVersions.map(v => v.id);
    const { data: progressData, error: progressError } = await supabase
      .from('text_version_progress')
      .select('text_version_id, complete_chapters, total_chapters')
      .in('text_version_id', versionIds);

    if (progressError) throw progressError;

    const progressMap = new Map<
      string,
      { complete_chapters: number; total_chapters: number }
    >();
    if (progressData) {
      for (const progress of progressData) {
        if (progress.text_version_id) {
          progressMap.set(progress.text_version_id, {
            complete_chapters: progress.complete_chapters || 0,
            total_chapters: progress.total_chapters || 0,
          });
        }
      }
    }

    return textVersions.map(version => {
      const progress = progressMap.get(version.id);
      return {
        ...version,
        progress: progress
          ? {
              complete_chapters: progress.complete_chapters,
              total_chapters: progress.total_chapters,
              progress_percentage:
                progress.total_chapters > 0
                  ? Math.round(
                      (progress.complete_chapters / progress.total_chapters) *
                        100
                    )
                  : 0,
            }
          : null,
      };
    });
  },

  /**
   * Fetch all audio versions for a project
   */
  async fetchAudioVersionsByProject(
    projectId: string
  ): Promise<AudioVersionWithProgress[]> {
    const { data: audioVersions, error } = await supabase
      .from('audio_versions')
      .select(
        'id, name, project_id, language_entity_id, created_at, updated_at'
      )
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!audioVersions || audioVersions.length === 0) {
      return [];
    }

    // Fetch progress for all versions
    const versionIds = audioVersions.map(v => v.id);
    const { data: progressData, error: progressError } = await supabase
      .from('audio_version_progress')
      .select('audio_version_id, chapters_with_audio, total_chapters')
      .in('audio_version_id', versionIds);

    if (progressError) throw progressError;

    const progressMap = new Map<
      string,
      { chapters_with_audio: number; total_chapters: number }
    >();
    if (progressData) {
      for (const progress of progressData) {
        if (progress.audio_version_id) {
          progressMap.set(progress.audio_version_id, {
            chapters_with_audio: progress.chapters_with_audio || 0,
            total_chapters: progress.total_chapters || 0,
          });
        }
      }
    }

    return audioVersions.map(version => {
      const progress = progressMap.get(version.id);
      return {
        ...version,
        progress: progress
          ? {
              chapters_with_audio: progress.chapters_with_audio,
              total_chapters: progress.total_chapters,
              progress_percentage:
                progress.total_chapters > 0
                  ? Math.round(
                      (progress.chapters_with_audio / progress.total_chapters) *
                        100
                    )
                  : 0,
            }
          : null,
      };
    });
  },

  /**
   * Fetch text version progress
   */
  async fetchTextVersionProgress(textVersionId: string): Promise<{
    complete_chapters: number;
    total_chapters: number;
    progress_percentage: number;
  } | null> {
    const { data, error } = await supabase
      .from('text_version_progress')
      .select('complete_chapters, total_chapters')
      .eq('text_version_id', textVersionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    if (!data || !data.total_chapters) return null;

    return {
      complete_chapters: data.complete_chapters || 0,
      total_chapters: data.total_chapters,
      progress_percentage:
        data.total_chapters > 0
          ? Math.round(
              ((data.complete_chapters || 0) / data.total_chapters) * 100
            )
          : 0,
    };
  },

  /**
   * Fetch audio version progress
   */
  async fetchAudioVersionProgress(audioVersionId: string): Promise<{
    chapters_with_audio: number;
    total_chapters: number;
    progress_percentage: number;
  } | null> {
    const { data, error } = await supabase
      .from('audio_version_progress')
      .select('chapters_with_audio, total_chapters')
      .eq('audio_version_id', audioVersionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    if (!data || !data.total_chapters) return null;

    return {
      chapters_with_audio: data.chapters_with_audio || 0,
      total_chapters: data.total_chapters,
      progress_percentage:
        data.total_chapters > 0
          ? Math.round(
              ((data.chapters_with_audio || 0) / data.total_chapters) * 100
            )
          : 0,
    };
  },

  /**
   * Update text version name
   */
  async updateTextVersionName(
    textVersionId: string,
    name: string
  ): Promise<void> {
    const { error } = await supabase
      .from('text_versions')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', textVersionId)
      .is('deleted_at', null);

    if (error) throw error;
  },

  /**
   * Update audio version name
   */
  async updateAudioVersionName(
    audioVersionId: string,
    name: string
  ): Promise<void> {
    const { error } = await supabase
      .from('audio_versions')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', audioVersionId)
      .is('deleted_at', null);

    if (error) throw error;
  },

  /**
   * Fetch verse texts by version with pagination, filters, and sorting
   */
  async fetchVerseTextsByVersion(
    textVersionId: string,
    params?: {
      page?: number;
      pageSize?: number;
      publishStatusFilter?: Database['public']['Enums']['publish_status'];
      sortField?: 'verse_id' | 'version' | 'publish_status';
      sortDirection?: 'asc' | 'desc';
    }
  ): Promise<{
    data: VerseText[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const sortField = params?.sortField ?? 'verse_id';
    const sortDirection = params?.sortDirection ?? 'asc';
    const sortAscending = sortDirection === 'asc';

    let query = supabase
      .from('verse_texts')
      .select('*', { count: 'exact' })
      .eq('text_version_id', textVersionId)
      .is('deleted_at', null);

    // Apply publish status filter
    if (params?.publishStatusFilter) {
      query = query.eq('publish_status', params.publishStatusFilter);
    }

    // Apply sorting
    switch (sortField) {
      case 'verse_id':
        query = query.order('verse_id', { ascending: sortAscending });
        break;
      case 'version':
        query = query.order('version', { ascending: sortAscending });
        break;
      case 'publish_status':
        query = query.order('publish_status', { ascending: sortAscending });
        break;
    }

    // Apply pagination
    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    return {
      data: (data || []) as VerseText[],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  /**
   * Fetch media files by version with pagination, filters, and sorting
   */
  async fetchMediaFilesByVersion(
    audioVersionId: string,
    params?: {
      page?: number;
      pageSize?: number;
      checkStatusFilter?: Database['public']['Enums']['check_status'];
      publishStatusFilter?: Database['public']['Enums']['publish_status'];
      bookIds?: string[];
      sortField?: 'chapter_id' | 'version' | 'check_status' | 'publish_status';
      sortDirection?: 'asc' | 'desc';
    }
  ): Promise<{
    data: MediaFile[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const sortField = params?.sortField ?? 'chapter_id';
    const sortDirection = params?.sortDirection ?? 'asc';
    const sortAscending = sortDirection === 'asc';

    let query = supabase
      .from('media_files')
      .select(
        `
        id,
        chapter_id,
        version,
        check_status,
        publish_status,
        upload_status,
        audio_version_id,
        chapter:chapters!chapter_id (
          id,
          chapter_number,
          book:books!book_id (
            id,
            name,
            global_order
          )
        )
      `,
        { count: 'exact' }
      )
      .eq('audio_version_id', audioVersionId)
      .eq('upload_status', 'completed')
      .eq('is_bible_audio', true)
      .is('deleted_at', null);

    // Apply filters
    if (params?.checkStatusFilter) {
      query = query.eq('check_status', params.checkStatusFilter);
    }

    if (params?.publishStatusFilter) {
      query = query.eq('publish_status', params.publishStatusFilter);
    }

    // Filter by book IDs if provided
    if (params?.bookIds && params.bookIds.length > 0) {
      // We need to filter by chapter's book_id, so we'll use a subquery approach
      // First, get chapter IDs for the specified books
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('id')
        .in('book_id', params.bookIds);

      if (chaptersError) throw chaptersError;

      if (chaptersData && chaptersData.length > 0) {
        const chapterIds = chaptersData.map(c => c.id);
        query = query.in('chapter_id', chapterIds);
      } else {
        // No chapters found for these books, return empty result
        return {
          data: [],
          count: 0,
          page: params.page || 1,
          pageSize: params.pageSize || 50,
          totalPages: 0,
        };
      }
    }

    // Apply sorting
    switch (sortField) {
      case 'chapter_id':
        query = query.order('chapter_id', { ascending: sortAscending });
        break;
      case 'version':
        query = query.order('version', { ascending: sortAscending });
        break;
      case 'check_status':
        query = query.order('check_status', { ascending: sortAscending });
        break;
      case 'publish_status':
        query = query.order('publish_status', { ascending: sortAscending });
        break;
    }

    // Apply pagination
    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    return {
      data: (data || []) as MediaFile[],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  /**
   * Fetch audio versions with pagination, filtering, and sorting
   */
  async fetchAudioVersionsPaginated(params?: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    projectIds?: string[];
    languageIds?: string[];
    sortField?: 'name' | 'project' | 'language' | 'progress';
    sortDirection?: 'asc' | 'desc';
  }): Promise<{
    data: AudioVersionPaginated[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const sortField = params?.sortField ?? 'name';
    const sortDirection = params?.sortDirection ?? 'asc';
    const sortAscending = sortDirection === 'asc';

    let query = supabase
      .from('audio_versions')
      .select(
        `
        id,
        name,
        project_id,
        language_entity_id,
        created_at,
        updated_at,
        project:projects!project_id (
          id,
          name
        ),
        language:language_entities!language_entity_id (
          id,
          name
        )
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null);

    // Apply search filter
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      const searchTerm = params.searchQuery.trim();
      query = query.ilike('name', `%${searchTerm}%`);
    }

    // Apply project filter
    if (params?.projectIds && params.projectIds.length > 0) {
      query = query.in('project_id', params.projectIds);
    }

    // Apply language filter
    if (params?.languageIds && params.languageIds.length > 0) {
      query = query.in('language_entity_id', params.languageIds);
    }

    // Apply sorting
    switch (sortField) {
      case 'name':
        query = query.order('name', { ascending: sortAscending });
        break;
      case 'project':
        query = query.order('name', {
          ascending: sortAscending,
          nullsFirst: sortAscending,
          foreignTable: 'project',
        });
        break;
      case 'language':
        query = query.order('name', {
          ascending: sortAscending,
          nullsFirst: sortAscending,
          foreignTable: 'language',
        });
        break;
      case 'progress':
        // For progress sorting, we'll need to fetch progress data separately
        // For now, sort by name as fallback
        query = query.order('name', { ascending: sortAscending });
        break;
    }

    // Apply pagination
    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    const versions = (data || []) as Array<{
      id: string;
      name: string;
      project_id: string | null;
      language_entity_id: string;
      created_at: string | null;
      updated_at: string | null;
      project: { id: string; name: string } | null;
      language: { id: string; name: string } | null;
    }>;

    // Fetch progress for all versions
    const versionIds = versions.map(v => v.id);
    const progressMap = new Map<
      string,
      { chapters_with_audio: number; total_chapters: number }
    >();

    if (versionIds.length > 0) {
      const { data: progressData, error: progressError } = await supabase
        .from('audio_version_progress')
        .select('audio_version_id, chapters_with_audio, total_chapters')
        .in('audio_version_id', versionIds);

      if (progressError) throw progressError;

      if (progressData) {
        for (const progress of progressData) {
          if (progress.audio_version_id) {
            progressMap.set(progress.audio_version_id, {
              chapters_with_audio: progress.chapters_with_audio || 0,
              total_chapters: progress.total_chapters || 0,
            });
          }
        }
      }
    }

    // Combine versions with progress
    const versionsWithProgress: AudioVersionPaginated[] = versions.map(
      version => {
        const progress = progressMap.get(version.id);
        return {
          id: version.id,
          name: version.name,
          project_id: version.project_id,
          language_entity_id: version.language_entity_id,
          created_at: version.created_at,
          updated_at: version.updated_at,
          project: version.project,
          language: version.language,
          progress: progress
            ? {
                chapters_with_audio: progress.chapters_with_audio,
                total_chapters: progress.total_chapters,
                progress_percentage:
                  progress.total_chapters > 0
                    ? Math.round(
                        (progress.chapters_with_audio /
                          progress.total_chapters) *
                          100
                      )
                    : 0,
              }
            : null,
        };
      }
    );

    // Apply progress sorting if needed (after fetching progress)
    if (sortField === 'progress') {
      versionsWithProgress.sort((a, b) => {
        const aProgress = a.progress?.progress_percentage || 0;
        const bProgress = b.progress?.progress_percentage || 0;
        return sortAscending ? aProgress - bProgress : bProgress - aProgress;
      });
    }

    return {
      data: versionsWithProgress,
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  /**
   * Fetch text versions with pagination, filtering, and sorting
   */
  async fetchTextVersionsPaginated(params?: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    projectIds?: string[];
    languageIds?: string[];
    sortField?: 'name' | 'project' | 'language' | 'progress';
    sortDirection?: 'asc' | 'desc';
  }): Promise<{
    data: TextVersionPaginated[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const sortField = params?.sortField ?? 'name';
    const sortDirection = params?.sortDirection ?? 'asc';
    const sortAscending = sortDirection === 'asc';

    let query = supabase
      .from('text_versions')
      .select(
        `
        id,
        name,
        project_id,
        language_entity_id,
        created_at,
        updated_at,
        project:projects!project_id (
          id,
          name
        ),
        language:language_entities!language_entity_id (
          id,
          name
        )
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null);

    // Apply search filter
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      const searchTerm = params.searchQuery.trim();
      query = query.ilike('name', `%${searchTerm}%`);
    }

    // Apply project filter
    if (params?.projectIds && params.projectIds.length > 0) {
      query = query.in('project_id', params.projectIds);
    }

    // Apply language filter
    if (params?.languageIds && params.languageIds.length > 0) {
      query = query.in('language_entity_id', params.languageIds);
    }

    // Apply sorting
    switch (sortField) {
      case 'name':
        query = query.order('name', { ascending: sortAscending });
        break;
      case 'project':
        query = query.order('name', {
          ascending: sortAscending,
          nullsFirst: sortAscending,
          foreignTable: 'project',
        });
        break;
      case 'language':
        query = query.order('name', {
          ascending: sortAscending,
          nullsFirst: sortAscending,
          foreignTable: 'language',
        });
        break;
      case 'progress':
        // For progress sorting, we'll need to fetch progress data separately
        // For now, sort by name as fallback
        query = query.order('name', { ascending: sortAscending });
        break;
    }

    // Apply pagination
    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    const versions = (data || []) as Array<{
      id: string;
      name: string;
      project_id: string | null;
      language_entity_id: string;
      created_at: string | null;
      updated_at: string | null;
      project: { id: string; name: string } | null;
      language: { id: string; name: string } | null;
    }>;

    // Fetch progress for all versions
    const versionIds = versions.map(v => v.id);
    const progressMap = new Map<
      string,
      { complete_chapters: number; total_chapters: number }
    >();

    if (versionIds.length > 0) {
      const { data: progressData, error: progressError } = await supabase
        .from('text_version_progress')
        .select('text_version_id, complete_chapters, total_chapters')
        .in('text_version_id', versionIds);

      if (progressError) throw progressError;

      if (progressData) {
        for (const progress of progressData) {
          if (progress.text_version_id) {
            progressMap.set(progress.text_version_id, {
              complete_chapters: progress.complete_chapters || 0,
              total_chapters: progress.total_chapters || 0,
            });
          }
        }
      }
    }

    // Combine versions with progress
    const versionsWithProgress: TextVersionPaginated[] = versions.map(
      version => {
        const progress = progressMap.get(version.id);
        return {
          id: version.id,
          name: version.name,
          project_id: version.project_id,
          language_entity_id: version.language_entity_id,
          created_at: version.created_at,
          updated_at: version.updated_at,
          project: version.project,
          language: version.language,
          progress: progress
            ? {
                complete_chapters: progress.complete_chapters,
                total_chapters: progress.total_chapters,
                progress_percentage:
                  progress.total_chapters > 0
                    ? Math.round(
                        (progress.complete_chapters / progress.total_chapters) *
                          100
                      )
                    : 0,
              }
            : null,
        };
      }
    );

    // Apply progress sorting if needed (after fetching progress)
    if (sortField === 'progress') {
      versionsWithProgress.sort((a, b) => {
        const aProgress = a.progress?.progress_percentage || 0;
        const bProgress = b.progress?.progress_percentage || 0;
        return sortAscending ? aProgress - bProgress : bProgress - aProgress;
      });
    }

    return {
      data: versionsWithProgress,
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  /**
   * Create a new text version
   */
  async createTextVersion(data: {
    name: string;
    project_id: string;
    language_entity_id: string;
    bible_version_id: string;
    publish_status?: Database['public']['Enums']['publish_status'];
  }): Promise<TextVersionWithProgress> {
    // Get current authenticated user for created_by field
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to create a text version');
    }

    const { data: textVersion, error } = await supabase
      .from('text_versions')
      .insert([
        {
          name: data.name,
          project_id: data.project_id,
          language_entity_id: data.language_entity_id,
          bible_version_id: data.bible_version_id,
          publish_status: data.publish_status || 'pending',
          created_by: user.id,
        },
      ])
      .select(
        'id, name, project_id, language_entity_id, created_at, updated_at'
      )
      .single();

    if (error) throw error;

    return {
      ...textVersion,
      progress: null,
    };
  },

  /**
   * Create a new audio version
   */
  async createAudioVersion(data: {
    name: string;
    project_id: string;
    language_entity_id: string;
    bible_version_id: string;
    publish_status?: Database['public']['Enums']['publish_status'];
  }): Promise<AudioVersionWithProgress> {
    // Get current authenticated user for created_by field
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to create an audio version');
    }

    const { data: audioVersion, error } = await supabase
      .from('audio_versions')
      .insert([
        {
          name: data.name,
          project_id: data.project_id,
          language_entity_id: data.language_entity_id,
          bible_version_id: data.bible_version_id,
          publish_status: data.publish_status || 'pending',
          created_by: user.id,
        },
      ])
      .select(
        'id, name, project_id, language_entity_id, created_at, updated_at'
      )
      .single();

    if (error) throw error;

    return {
      ...audioVersion,
      progress: null,
    };
  },

  /**
   * Fetch all bible versions
   */
  async fetchBibleVersions(): Promise<Array<{ id: string; name: string }>> {
    const { data, error } = await supabase
      .from('bible_versions')
      .select('id, name')
      .order('name');

    if (error) throw error;
    return data || [];
  },
};
