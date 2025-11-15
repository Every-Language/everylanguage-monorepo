import { supabase } from '@/shared/services/supabase';
import type { Project, LanguageEntity, Region } from '@/types';

export interface ProjectWithDetails extends Project {
  target_language?: LanguageEntity | null;
  source_language?: LanguageEntity | null;
  region?: Region | null;
}

export const projectsApi = {
  /**
   * Fetch all projects with pagination and search
   */
  async fetchProjects(params?: {
    searchQuery?: string;
    page?: number;
    pageSize?: number;
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
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply search if provided
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      query = query.ilike('name', `%${params.searchQuery.trim()}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    const totalPages = count ? Math.ceil(count / pageSize) : 1;

    return {
      data: (data || []) as ProjectWithDetails[],
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

    return data as ProjectWithDetails;
  },
};
