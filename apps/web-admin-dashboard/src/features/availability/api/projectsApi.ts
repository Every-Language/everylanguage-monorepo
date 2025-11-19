import { supabase } from '@/shared/services/supabase';
import type { Project, LanguageEntity, Region } from '@/types';
import type { Database } from '@everylanguage/shared-types';
import {
  extractLocation,
  locationToPostGIS,
} from '@/shared/utils/locationUtils';

export interface ProjectWithDetails extends Omit<Project, 'location'> {
  target_language?: LanguageEntity | null;
  source_language?: LanguageEntity | null;
  region?: Region | null;
  location?: { lat: number; lng: number } | null;
  progress?: {
    completed_chapters: number;
    total_chapters: number;
    progress_percentage: number;
  } | null;
}

export interface UpdateProjectData {
  name?: string;
  description?: string | null;
  target_language_entity_id?: string;
  source_language_entity_id?: string;
  region_id?: string | null;
  location?: { lat: number; lng: number } | null;
  project_status?: Database['public']['Enums']['project_status'];
  funding_status?: Database['public']['Enums']['funding_status'];
}

export const projectsApi = {
  /**
   * Fetch all projects with pagination and search
   */
  async fetchProjects(params?: {
    searchQuery?: string;
    page?: number;
    pageSize?: number;
    sourceLanguageIds?: string[];
    targetLanguageIds?: string[];
    regionIds?: string[];
    statusFilter?: Database['public']['Enums']['project_status'];
    sortField?: 'name' | 'created_at' | 'source_language' | 'target_language';
    sortDirection?: 'asc' | 'desc';
  }): Promise<{
    data: ProjectWithDetails[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const sortField = params?.sortField ?? 'created_at';
    const sortDirection = params?.sortDirection ?? 'desc';
    const sortAscending = sortDirection === 'asc';

    let query = supabase
      .from('projects')
      .select(
        `
        *,
        target_language:language_entities!projects_target_language_entity_id_fkey (
          id,
          name,
          level
        ),
        source_language:language_entities!projects_source_language_entity_id_fkey (
          id,
          name,
          level
        ),
        region:regions!projects_region_id_fkey (
          id,
          name,
          level
        )
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null);

    // Apply search if provided
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      const searchTerm = params.searchQuery.trim();
      query = query.or(
        `name.ilike.%${searchTerm}%,target_language.name.ilike.%${searchTerm}%,source_language.name.ilike.%${searchTerm}%`
      );
    }

    if (params?.sourceLanguageIds?.length) {
      query = query.in('source_language_entity_id', params.sourceLanguageIds);
    }

    if (params?.targetLanguageIds?.length) {
      query = query.in('target_language_entity_id', params.targetLanguageIds);
    }

    if (params?.regionIds?.length) {
      query = query.in('region_id', params.regionIds);
    }

    if (params?.statusFilter) {
      query = query.eq('project_status', params.statusFilter);
    }

    switch (sortField) {
      case 'name':
        query = query.order('name', { ascending: sortAscending });
        break;
      case 'source_language':
        query = query.order('name', {
          ascending: sortAscending,
          nullsFirst: sortAscending,
          foreignTable: 'source_language',
        });
        break;
      case 'target_language':
        query = query.order('name', {
          ascending: sortAscending,
          nullsFirst: sortAscending,
          foreignTable: 'target_language',
        });
        break;
      case 'created_at':
      default:
        query = query.order('created_at', { ascending: sortAscending });
        break;
    }

    if (sortField !== 'created_at') {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    // Fetch progress for all projects in a single batch query
    const projectIds = (data || []).map(p => p.id);
    const projectsWithProgress: ProjectWithDetails[] = [];

    if (projectIds.length > 0) {
      // Get first audio_version_id for each project
      const { data: audioVersionsData, error: audioVersionsError } =
        await supabase
          .from('audio_versions')
          .select('id, project_id')
          .in('project_id', projectIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

      if (audioVersionsError) throw audioVersionsError;

      // Group audio versions by project_id and get the first one for each project
      const projectToAudioVersionMap = new Map<string, string>();
      if (audioVersionsData) {
        for (const av of audioVersionsData) {
          if (av.project_id && !projectToAudioVersionMap.has(av.project_id)) {
            projectToAudioVersionMap.set(av.project_id, av.id);
          }
        }
      }

      // Fetch all progress data in a single query
      const audioVersionIds = Array.from(projectToAudioVersionMap.values());
      const progressMap = new Map<
        string,
        { chapters_with_audio: number; total_chapters: number }
      >();

      if (audioVersionIds.length > 0) {
        const { data: progressData, error: progressError } = await supabase
          .from('mv_audio_version_progress_summary')
          .select('audio_version_id, chapters_with_audio, total_chapters')
          .in('audio_version_id', audioVersionIds);

        if (progressError) throw progressError;

        if (progressData) {
          for (const progress of progressData) {
            if (!progress.audio_version_id) {
              continue;
            }
            progressMap.set(progress.audio_version_id, {
              chapters_with_audio: progress.chapters_with_audio || 0,
              total_chapters: progress.total_chapters || 0,
            });
          }
        }
      }

      // Map progress data to projects
      for (const project of data || []) {
        const audioVersionId = projectToAudioVersionMap.get(project.id);
        const progressData = audioVersionId
          ? progressMap.get(audioVersionId)
          : null;

        if (progressData && progressData.total_chapters > 0) {
          const completedChapters = progressData.chapters_with_audio || 0;
          const totalChapters = progressData.total_chapters;
          const progressPercentage =
            totalChapters > 0
              ? Math.round((completedChapters / totalChapters) * 100)
              : 0;

          projectsWithProgress.push({
            ...project,
            progress: {
              completed_chapters: completedChapters,
              total_chapters: totalChapters,
              progress_percentage: progressPercentage,
            },
          } as ProjectWithDetails);
        } else {
          projectsWithProgress.push({
            ...project,
            progress: null,
          } as ProjectWithDetails);
        }
      }
    } else {
      // No projects, return empty array with progress null
      projectsWithProgress.push(
        ...((data || []).map(p => ({
          ...p,
          progress: null,
        })) as ProjectWithDetails[])
      );
    }

    const totalPages = count ? Math.ceil(count / pageSize) : 1;

    return {
      data: projectsWithProgress as ProjectWithDetails[],
      count: count || 0,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Fetch a single project by ID with full details
   */
  async fetchProjectById(
    projectId: string
  ): Promise<ProjectWithDetails | null> {
    const { data, error } = await supabase
      .from('projects')
      .select(
        `
        *,
        target_language:language_entities!projects_target_language_entity_id_fkey (
          id,
          name,
          level
        ),
        source_language:language_entities!projects_source_language_entity_id_fkey (
          id,
          name,
          level
        ),
        region:regions!projects_region_id_fkey (
          id,
          name,
          level
        )
      `
      )
      .eq('id', projectId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }

    // Fetch progress
    const { data: audioVersions } = await supabase
      .from('audio_versions')
      .select('id')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .limit(1);

    let progress = null;
    if (audioVersions && audioVersions.length > 0) {
      const { data: progressData } = await supabase
        .from('mv_audio_version_progress_summary')
        .select('chapters_with_audio, total_chapters')
        .eq('audio_version_id', audioVersions[0].id)
        .single();

      if (progressData && progressData.total_chapters) {
        const completedChapters = progressData.chapters_with_audio || 0;
        const totalChapters = progressData.total_chapters;
        const progressPercentage =
          totalChapters > 0
            ? Math.round((completedChapters / totalChapters) * 100)
            : 0;

        progress = {
          completed_chapters: completedChapters,
          total_chapters: totalChapters,
          progress_percentage: progressPercentage,
        };
      }
    }

    // Extract location from PostGIS geometry
    const location = extractLocation(data.location);

    return { ...data, progress, location } as ProjectWithDetails;
  },

  /**
   * Update a project
   */
  async updateProject(
    projectId: string,
    updates: UpdateProjectData
  ): Promise<void> {
    // Convert location to PostGIS format if provided
    const locationValue =
      updates.location !== undefined
        ? locationToPostGIS(updates.location)
        : undefined;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.target_language_entity_id !== undefined) {
      updateData.target_language_entity_id = updates.target_language_entity_id;
    }
    if (updates.source_language_entity_id !== undefined) {
      updateData.source_language_entity_id = updates.source_language_entity_id;
    }
    if (updates.region_id !== undefined)
      updateData.region_id = updates.region_id;
    if (updates.project_status !== undefined) {
      updateData.project_status = updates.project_status;
    }
    if (updates.funding_status !== undefined) {
      updateData.funding_status = updates.funding_status;
    }
    if (locationValue !== undefined) updateData.location = locationValue;

    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .is('deleted_at', null);

    if (error) throw error;
  },
};
