import { supabase } from '@/shared/services/supabase';
import type {
  ProjectUpdateWithProject,
  CreateProjectUpdateData,
  UpdateProjectUpdateData,
  ProjectUpdateFilters,
  ProjectForSelector,
} from '../types';
import type { Database } from '@everylanguage/shared-types';

export const projectUpdatesApi = {
  /**
   * Fetch project updates with pagination and filters
   */
  async fetchProjectUpdates(filters: ProjectUpdateFilters = {}): Promise<{
    data: ProjectUpdateWithProject[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('project_updates')
      .select(
        `
        *,
        project:projects!project_updates_project_id_fkey (
          id,
          name,
          target_language_entity_id,
          target_language:language_entities!projects_target_language_entity_id_fkey (
            id,
            name
          ),
          region:regions!projects_region_id_fkey (
            id,
            name
          )
        ),
        media:project_updates_media (
          id,
          media_type,
          object_key,
          original_filename,
          display_order,
          thumbnail_object_key
        )
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply publish status filter
    if (filters.publishStatus && filters.publishStatus !== 'all') {
      query = query.eq(
        'publish_status',
        filters.publishStatus as Database['public']['Enums']['publish_status']
      );
    }

    // Apply project filter
    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: (data || []) as ProjectUpdateWithProject[],
      count: totalCount,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Create a new project update
   */
  async createProjectUpdate(
    data: CreateProjectUpdateData
  ): Promise<ProjectUpdateWithProject> {
    const { data: update, error } = await supabase
      .from('project_updates')
      .insert([
        {
          project_id: data.project_id,
          title: data.title,
          body: data.body,
          publish_status: data.publish_status,
          created_by: data.created_by || null,
        },
      ])
      .select(
        `
        *,
        project:projects!project_updates_project_id_fkey (
          id,
          name,
          target_language_entity_id,
          target_language:language_entities!projects_target_language_entity_id_fkey (
            id,
            name
          ),
          region:regions!projects_region_id_fkey (
            id,
            name
          )
        )
      `
      )
      .single();

    if (error) throw error;
    if (!update) throw new Error('Failed to create project update');

    return update as ProjectUpdateWithProject;
  },

  /**
   * Update an existing project update
   */
  async updateProjectUpdate(
    updateId: string,
    data: UpdateProjectUpdateData
  ): Promise<ProjectUpdateWithProject> {
    const { data: update, error } = await supabase
      .from('project_updates')
      .update({
        title: data.title,
        body: data.body,
        publish_status: data.publish_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', updateId)
      .select(
        `
        *,
        project:projects!project_updates_project_id_fkey (
          id,
          name,
          target_language_entity_id,
          target_language:language_entities!projects_target_language_entity_id_fkey (
            id,
            name
          ),
          region:regions!projects_region_id_fkey (
            id,
            name
          )
        )
      `
      )
      .single();

    if (error) throw error;
    if (!update) throw new Error('Failed to update project update');

    return update as ProjectUpdateWithProject;
  },

  /**
   * Delete (soft delete) a project update
   */
  async deleteProjectUpdate(updateId: string): Promise<void> {
    const { error } = await supabase
      .from('project_updates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', updateId);

    if (error) throw error;
  },

  /**
   * Fetch media for a project update
   */
  async fetchProjectUpdateMedia(updateId: string): Promise<
    Array<{
      id: string;
      media_type: 'image' | 'video';
      object_key: string;
      original_filename: string | null;
      caption: string | null;
      display_order: number;
      thumbnail_object_key: string | null;
    }>
  > {
    const { data, error } = await supabase
      .from('project_updates_media')
      .select(
        'id, media_type, object_key, original_filename, caption, display_order, thumbnail_object_key'
      )
      .eq('project_update_id', updateId)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return (data || []) as Array<{
      id: string;
      media_type: 'image' | 'video';
      object_key: string;
      original_filename: string | null;
      caption: string | null;
      display_order: number;
      thumbnail_object_key: string | null;
    }>;
  },

  /**
   * Delete (soft delete) a media item
   */
  async deleteProjectUpdateMedia(mediaId: string): Promise<void> {
    const { error } = await supabase
      .from('project_updates_media')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', mediaId);

    if (error) throw error;
  },

  /**
   * Search projects for selector component
   * Uses the search_projects RPC function which searches by project name and target language name
   */
  async searchProjectsForSelector(
    searchQuery: string,
    limit = 20
  ): Promise<ProjectForSelector[]> {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return [];
    }

    const searchTerm = searchQuery.trim();

    // Use the search_projects RPC function for fuzzy search
    const { data: rpcResults, error: rpcError } = await (
      supabase as unknown as {
        rpc: (
          name: string,
          params: {
            search_query: string;
            max_results: number;
            min_similarity: number;
          }
        ) => Promise<{
          data: Array<{
            project_id: string;
            project_name: string;
            target_language_entity_id: string;
            target_language_name: string;
            similarity_score: number;
          }> | null;
          error: { message: string } | null;
        }>;
      }
    ).rpc('search_projects', {
      search_query: searchTerm,
      max_results: limit,
      min_similarity: 0.1,
    });

    if (rpcError) {
      console.error('Error searching projects:', rpcError);
      throw new Error(rpcError.message || 'Failed to search projects');
    }

    if (!rpcResults || rpcResults.length === 0) {
      return [];
    }

    // Fetch full project details with region information
    const projectIds = rpcResults.map(r => r.project_id);
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select(
        `
        id,
        name,
        target_language_entity_id,
        target_language:language_entities!projects_target_language_entity_id_fkey (
          id,
          name
        ),
        region:regions!projects_region_id_fkey (
          id,
          name
        )
      `
      )
      .in('id', projectIds)
      .is('deleted_at', null);

    if (projectsError) throw projectsError;

    // Maintain the order from RPC results (sorted by similarity)
    const projectMap = new Map(
      (projectsData || []).map(p => [p.id, p as ProjectForSelector])
    );
    const orderedProjects = rpcResults
      .map(r => projectMap.get(r.project_id))
      .filter((p): p is ProjectForSelector => p !== undefined);

    return orderedProjects;
  },
};
