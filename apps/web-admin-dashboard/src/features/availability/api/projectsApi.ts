import { supabase } from '@/shared/services/supabase';
import type { Project, LanguageEntity, Region } from '@/types';
import type { Database } from '@everylanguage/shared-types';
import {
  extractLocation,
  locationToPostGIS,
} from '@/shared/utils/locationUtils';
import type { UserRoleAssignment } from '@/features/users/types';

export interface TextVersionProgress {
  id: string;
  name: string;
  progress: {
    complete_chapters: number;
    total_chapters: number;
    progress_percentage: number;
  } | null;
}

export interface AudioVersionProgress {
  id: string;
  name: string;
  progress: {
    chapters_with_audio: number;
    total_chapters: number;
    progress_percentage: number;
  } | null;
}

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
  textVersions?: TextVersionProgress[];
  audioVersions?: AudioVersionProgress[];
}

export interface UpdateProjectData {
  name?: string;
  description?: string | null;
  target_language_entity_id?: string;
  source_language_entity_id?: string;
  region_id?: string | null;
  location?: { lat: number; lng: number } | null;
  project_status?: Database['public']['Enums']['project_status'];
  publish_status?: Database['public']['Enums']['publish_status'];
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

    // If search query is provided, use the search_projects RPC function
    // to find matching projects by name or target language name
    let searchProjectIds: string[] | null = null;
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      const searchTerm = params.searchQuery.trim();

      try {
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
          max_results: 1000, // Get enough results to apply filters and pagination
          min_similarity: 0.1,
        });

        if (rpcError) {
          console.error('Error searching projects via RPC:', rpcError);
          // Fall back to name-only search if RPC fails
          searchProjectIds = null;
        } else if (rpcResults && rpcResults.length > 0) {
          searchProjectIds = rpcResults.map(r => r.project_id);
        } else {
          // No matches found, return empty result
          searchProjectIds = [];
        }
      } catch (error) {
        console.error('Error calling search_projects RPC:', error);
        // Fall back to name-only search if RPC fails
        searchProjectIds = null;
      }
    }

    // If search returned no results, return empty early
    if (searchProjectIds !== null && searchProjectIds.length === 0) {
      return {
        data: [],
        count: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

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

    // Apply search filter if we have project IDs from RPC search
    if (searchProjectIds !== null && searchProjectIds.length > 0) {
      query = query.in('id', searchProjectIds);
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
      // Get first audio_version_id for each project (for backward compatibility with progress field)
      const { data: firstAudioVersionsData, error: firstAudioVersionsError } =
        await supabase
          .from('audio_versions')
          .select('id, project_id')
          .in('project_id', projectIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

      if (firstAudioVersionsError) throw firstAudioVersionsError;

      // Group audio versions by project_id and get the first one for each project
      const projectToAudioVersionMap = new Map<string, string>();
      if (firstAudioVersionsData) {
        for (const av of firstAudioVersionsData) {
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
          .from('audio_version_progress')
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

      // Fetch all text and audio versions for all projects
      const [textVersionsData, audioVersionsData] = await Promise.all([
        supabase
          .from('text_versions')
          .select('id, name, project_id')
          .in('project_id', projectIds)
          .is('deleted_at', null),
        supabase
          .from('audio_versions')
          .select('id, name, project_id')
          .in('project_id', projectIds)
          .is('deleted_at', null),
      ]);

      if (textVersionsData.error) throw textVersionsData.error;
      if (audioVersionsData.error) throw audioVersionsData.error;

      // Group versions by project_id
      const textVersionsByProject = new Map<
        string,
        Array<{ id: string; name: string }>
      >();
      const audioVersionsByProject = new Map<
        string,
        Array<{ id: string; name: string }>
      >();

      if (textVersionsData.data) {
        for (const tv of textVersionsData.data) {
          if (tv.project_id) {
            if (!textVersionsByProject.has(tv.project_id)) {
              textVersionsByProject.set(tv.project_id, []);
            }
            textVersionsByProject.get(tv.project_id)!.push({
              id: tv.id,
              name: tv.name,
            });
          }
        }
      }

      if (audioVersionsData.data) {
        for (const av of audioVersionsData.data) {
          if (av.project_id) {
            if (!audioVersionsByProject.has(av.project_id)) {
              audioVersionsByProject.set(av.project_id, []);
            }
            audioVersionsByProject.get(av.project_id)!.push({
              id: av.id,
              name: av.name,
            });
          }
        }
      }

      // Fetch progress for all text and audio versions
      const allTextVersionIds = Array.from(textVersionsByProject.values())
        .flat()
        .map(v => v.id);
      const allAudioVersionIds = Array.from(audioVersionsByProject.values())
        .flat()
        .map(v => v.id);

      const [textProgressData, audioProgressData] = await Promise.all([
        allTextVersionIds.length > 0
          ? supabase
              .from('text_version_progress')
              .select('text_version_id, complete_chapters, total_chapters')
              .in('text_version_id', allTextVersionIds)
          : { data: null, error: null },
        allAudioVersionIds.length > 0
          ? supabase
              .from('audio_version_progress')
              .select('audio_version_id, chapters_with_audio, total_chapters')
              .in('audio_version_id', allAudioVersionIds)
          : { data: null, error: null },
      ]);

      if (textProgressData.error) throw textProgressData.error;
      if (audioProgressData.error) throw audioProgressData.error;

      // Create progress maps
      const textProgressMap = new Map<
        string,
        { complete_chapters: number; total_chapters: number }
      >();
      const audioProgressMap = new Map<
        string,
        { chapters_with_audio: number; total_chapters: number }
      >();

      if (textProgressData.data) {
        for (const progress of textProgressData.data) {
          if (progress.text_version_id) {
            textProgressMap.set(progress.text_version_id, {
              complete_chapters: progress.complete_chapters || 0,
              total_chapters: progress.total_chapters || 0,
            });
          }
        }
      }

      if (audioProgressData.data) {
        for (const progress of audioProgressData.data) {
          if (progress.audio_version_id) {
            audioProgressMap.set(progress.audio_version_id, {
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

        // Build text versions with progress
        const textVersions: TextVersionProgress[] = (
          textVersionsByProject.get(project.id) || []
        ).map(version => {
          const progress = textProgressMap.get(version.id);
          return {
            id: version.id,
            name: version.name,
            progress: progress
              ? {
                  complete_chapters: progress.complete_chapters,
                  total_chapters: progress.total_chapters,
                  progress_percentage:
                    progress.total_chapters > 0
                      ? Math.round(
                          (progress.complete_chapters /
                            progress.total_chapters) *
                            100
                        )
                      : 0,
                }
              : null,
          };
        });

        // Build audio versions with progress
        const audioVersions: AudioVersionProgress[] = (
          audioVersionsByProject.get(project.id) || []
        ).map(version => {
          const progress = audioProgressMap.get(version.id);
          return {
            id: version.id,
            name: version.name,
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
        });

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
            textVersions,
            audioVersions,
          } as ProjectWithDetails);
        } else {
          projectsWithProgress.push({
            ...project,
            progress: null,
            textVersions,
            audioVersions,
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

    // Fetch all versions for this project
    const [textVersionsResult, audioVersionsResult] = await Promise.all([
      supabase
        .from('text_versions')
        .select('id, name')
        .eq('project_id', projectId)
        .is('deleted_at', null),
      supabase
        .from('audio_versions')
        .select('id, name')
        .eq('project_id', projectId)
        .is('deleted_at', null),
    ]);

    if (textVersionsResult.error) throw textVersionsResult.error;
    if (audioVersionsResult.error) throw audioVersionsResult.error;

    const textVersionIds = (textVersionsResult.data || []).map(v => v.id);
    const audioVersionIds = (audioVersionsResult.data || []).map(v => v.id);

    // Fetch progress for all versions
    const [textProgressResult, audioProgressResult] = await Promise.all([
      textVersionIds.length > 0
        ? supabase
            .from('text_version_progress')
            .select('text_version_id, complete_chapters, total_chapters')
            .in('text_version_id', textVersionIds)
        : { data: null, error: null },
      audioVersionIds.length > 0
        ? supabase
            .from('audio_version_progress')
            .select('audio_version_id, chapters_with_audio, total_chapters')
            .in('audio_version_id', audioVersionIds)
        : { data: null, error: null },
    ]);

    if (textProgressResult.error) throw textProgressResult.error;
    if (audioProgressResult.error) throw audioProgressResult.error;

    // Build progress maps
    const textProgressMap = new Map<
      string,
      { complete_chapters: number; total_chapters: number }
    >();
    const audioProgressMap = new Map<
      string,
      { chapters_with_audio: number; total_chapters: number }
    >();

    if (textProgressResult.data) {
      for (const progress of textProgressResult.data) {
        if (progress.text_version_id) {
          textProgressMap.set(progress.text_version_id, {
            complete_chapters: progress.complete_chapters || 0,
            total_chapters: progress.total_chapters || 0,
          });
        }
      }
    }

    if (audioProgressResult.data) {
      for (const progress of audioProgressResult.data) {
        if (progress.audio_version_id) {
          audioProgressMap.set(progress.audio_version_id, {
            chapters_with_audio: progress.chapters_with_audio || 0,
            total_chapters: progress.total_chapters || 0,
          });
        }
      }
    }

    // Build version arrays with progress
    const textVersions: TextVersionProgress[] = (
      textVersionsResult.data || []
    ).map(version => {
      const progress = textProgressMap.get(version.id);
      return {
        id: version.id,
        name: version.name,
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

    const audioVersions: AudioVersionProgress[] = (
      audioVersionsResult.data || []
    ).map(version => {
      const progress = audioProgressMap.get(version.id);
      return {
        id: version.id,
        name: version.name,
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

    // Fetch progress for first audio version (for backward compatibility)
    let progress = null;
    if (audioVersionsResult.data && audioVersionsResult.data.length > 0) {
      const firstAudioVersionId = audioVersionsResult.data[0].id;
      const progressData = audioProgressMap.get(firstAudioVersionId);

      if (progressData && progressData.total_chapters > 0) {
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

    return {
      ...data,
      progress,
      location,
      textVersions,
      audioVersions,
    } as ProjectWithDetails;
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
    if (updates.publish_status !== undefined) {
      updateData.publish_status = updates.publish_status;
    }
    if (locationValue !== undefined) updateData.location = locationValue;

    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .is('deleted_at', null);

    if (error) throw error;
  },

  /**
   * Fetch users assigned to project
   * Uses direct query now that RLS recursion is fixed
   */
  async fetchProjectUsers(projectId: string): Promise<UserRoleAssignment[]> {
    const { data: members, error } = await supabase
      .from('user_roles')
      .select(
        `
        id,
        user_id,
        role_id,
        user:users!user_roles_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        role:roles!user_roles_role_id_fkey (
          id,
          name,
          role_key,
          resource_type
        )
      `
      )
      .eq('project_id', projectId)
      .not('project_id', 'is', null);

    if (error) {
      console.error('Error fetching project users:', error);
      throw new Error(error.message || 'Failed to fetch project users');
    }

    if (!members || members.length === 0) {
      return [];
    }

    // Map to UserRoleAssignment format
    type MemberRow = {
      id: string;
      user_id: string;
      role_id: string | null;
      user: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      } | null;
      role: {
        id: string;
        name: string;
        role_key: string | null;
        resource_type: Database['public']['Enums']['resource_type'] | null;
      } | null;
    };

    return members.map((member: MemberRow) => {
      const user = member.user;
      const role = member.role;
      const userFullName = user
        ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || null
        : null;

      return {
        id: member.id || '',
        user_id: member.user_id,
        role_id: member.role_id || '',
        project_id: projectId,
        base_id: null,
        partner_org_id: null,
        is_global: false,
        role: role
          ? {
              id: role.id || '',
              name: role.name || '',
              role_key: role.role_key || null,
              resource_type: role.resource_type || null,
              created_at: null,
              updated_at: null,
            }
          : {
              id: '',
              name: '',
              role_key: null,
              resource_type: null,
              created_at: null,
              updated_at: null,
            },
        user_email: user?.email || undefined,
        user_name: userFullName || undefined,
      };
    });
  },

  /**
   * Assign user to project with role
   */
  async assignUserToProject(
    projectId: string,
    userId: string,
    roleId: string
  ): Promise<UserRoleAssignment> {
    // Check if user already has a role for this project
    const { data: existing } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .not('project_id', 'is', null)
      .maybeSingle();

    let result;
    if (existing) {
      // Update existing role
      const { data, error } = await supabase
        .from('user_roles')
        .update({
          role_id: roleId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select(
          `
          *,
          roles (*),
          users (*)
        `
        )
        .single();

      if (error) {
        console.error('Error updating user role in project:', error);
        throw new Error(
          error.message || 'Failed to update user role in project'
        );
      }
      result = data;
    } else {
      // Insert new role
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          project_id: projectId,
        })
        .select(
          `
          *,
          roles (*),
          users (*)
        `
        )
        .single();

      if (error) {
        console.error('Error assigning user to project:', error);
        throw new Error(error.message || 'Failed to assign user to project');
      }
      result = data;
    }

    const role = result.roles as unknown as {
      id: string;
      name: string;
      role_key: string | null;
      resource_type: string | null;
      created_at: string | null;
      updated_at: string | null;
    };
    const user = result.users as unknown as {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    } | null;
    return {
      id: result.id,
      user_id: result.user_id,
      role_id: result.role_id,
      project_id: result.project_id,
      base_id: result.base_id,
      partner_org_id: result.partner_org_id,
      is_global: result.is_global,
      role: {
        id: role.id,
        name: role.name,
        role_key: role.role_key,
        resource_type: role.resource_type as
          | Database['public']['Enums']['resource_type']
          | null,
        created_at: role.created_at,
        updated_at: role.updated_at,
      },
      user_email: user?.email || undefined,
      user_name: user
        ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || undefined
        : undefined,
    };
  },

  /**
   * Remove user assignment from project
   */
  async removeUserFromProject(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error removing user from project:', error);
      throw new Error(error.message || 'Failed to remove user from project');
    }
  },

  /**
   * Get assignment ID for a user-project combination
   * Helper function to get assignmentId when RPC doesn't return it
   */
  async getProjectAssignmentId(
    projectId: string,
    userId: string
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .not('project_id', 'is', null)
      .maybeSingle();

    if (error) {
      console.error('Error fetching project assignment ID:', error);
      return null;
    }

    return data?.id || null;
  },

  /**
   * Fetch bases assigned to project
   */
  async fetchProjectBases(projectId: string): Promise<
    Array<{
      id: string;
      base_id: string;
      base_name: string;
      region_name: string | null;
    }>
  > {
    // First, fetch bases_projects with base info (without region join)
    const { data: basesProjectsData, error: basesProjectsError } =
      await supabase
        .from('bases_projects')
        .select(
          `
        id,
        base_id,
        base:bases (
          name,
          region_id
        )
      `
        )
        .eq('project_id', projectId)
        .is('unassigned_at', null);

    if (basesProjectsError) {
      console.error('Error fetching project bases:', basesProjectsError);
      throw new Error(
        basesProjectsError.message || 'Failed to fetch project bases'
      );
    }

    if (!basesProjectsData || basesProjectsData.length === 0) {
      return [];
    }

    // Extract unique region_ids
    const regionIds = new Set<string>();
    for (const row of basesProjectsData) {
      const base = row.base as { region_id: string | null } | null;
      if (base?.region_id) {
        regionIds.add(base.region_id);
      }
    }

    // Fetch regions separately
    const regionMap = new Map<string, string>();
    if (regionIds.size > 0) {
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('id, name')
        .in('id', Array.from(regionIds));

      if (regionsError) {
        console.error('Error fetching regions:', regionsError);
        // Don't throw - just continue without region names
      } else if (regionsData) {
        for (const region of regionsData) {
          regionMap.set(region.id, region.name);
        }
      }
    }

    // Map results
    type ProjectBaseRow = {
      id: string;
      base_id: string;
      base: {
        name: string;
        region_id: string | null;
      } | null;
    };

    return ((basesProjectsData || []) as unknown as ProjectBaseRow[]).map(
      row => {
        const base = row.base;
        const regionId = base?.region_id || null;
        const regionName = regionId ? regionMap.get(regionId) || null : null;

        return {
          id: row.id,
          base_id: row.base_id,
          base_name: base?.name || '',
          region_name: regionName,
        };
      }
    );
  },

  /**
   * Assign base to project
   */
  async assignBaseToProject(projectId: string, baseId: string): Promise<void> {
    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('bases_projects')
      .select('id')
      .eq('project_id', projectId)
      .eq('base_id', baseId)
      .is('unassigned_at', null)
      .maybeSingle();

    if (existing) {
      // Already assigned, do nothing
      return;
    }

    // Check if there's an unassigned entry to reactivate
    const { data: unassigned } = await supabase
      .from('bases_projects')
      .select('id')
      .eq('project_id', projectId)
      .eq('base_id', baseId)
      .not('unassigned_at', 'is', null)
      .maybeSingle();

    if (unassigned) {
      // Reactivate by clearing unassigned_at
      const { error } = await supabase
        .from('bases_projects')
        .update({ unassigned_at: null })
        .eq('id', unassigned.id);

      if (error) {
        console.error('Error reactivating project base:', error);
        throw new Error(error.message || 'Failed to assign base to project');
      }
    } else {
      // Create new assignment
      const { error } = await supabase.from('bases_projects').insert({
        project_id: projectId,
        base_id: baseId,
      });

      if (error) {
        console.error('Error assigning base to project:', error);
        throw new Error(error.message || 'Failed to assign base to project');
      }
    }
  },

  /**
   * Unassign base from project (soft delete)
   */
  async unassignBaseFromProject(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from('bases_projects')
      .update({ unassigned_at: new Date().toISOString() })
      .eq('id', assignmentId);

    if (error) {
      console.error('Error unassigning base from project:', error);
      throw new Error(error.message || 'Failed to unassign base from project');
    }
  },

  /**
   * Fetch partner orgs assigned to project
   */
  async fetchProjectPartnerOrgs(projectId: string): Promise<
    Array<{
      id: string;
      partner_org_id: string;
      partner_org_name: string;
      is_public: boolean;
    }>
  > {
    const { data, error } = await supabase
      .from('partner_orgs_projects')
      .select(
        `
        id,
        partner_org_id,
        partner_org:partner_orgs (
          name,
          is_public
        )
      `
      )
      .eq('project_id', projectId)
      .is('unassigned_at', null);

    if (error) {
      console.error('Error fetching project partner orgs:', error);
      throw new Error(error.message || 'Failed to fetch project partner orgs');
    }

    type ProjectPartnerOrgRow = {
      id: string;
      partner_org_id: string;
      partner_org: {
        name: string;
        is_public: boolean;
      } | null;
    };

    return ((data || []) as unknown as ProjectPartnerOrgRow[]).map(row => ({
      id: row.id,
      partner_org_id: row.partner_org_id,
      partner_org_name: row.partner_org?.name || '',
      is_public: row.partner_org?.is_public ?? false,
    }));
  },

  /**
   * Assign partner org to project
   */
  async assignPartnerOrgToProject(
    projectId: string,
    partnerOrgId: string
  ): Promise<void> {
    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('partner_orgs_projects')
      .select('id')
      .eq('project_id', projectId)
      .eq('partner_org_id', partnerOrgId)
      .is('unassigned_at', null)
      .maybeSingle();

    if (existing) {
      // Already assigned, do nothing
      return;
    }

    // Check if there's an unassigned entry to reactivate
    const { data: unassigned } = await supabase
      .from('partner_orgs_projects')
      .select('id')
      .eq('project_id', projectId)
      .eq('partner_org_id', partnerOrgId)
      .not('unassigned_at', 'is', null)
      .maybeSingle();

    if (unassigned) {
      // Reactivate by clearing unassigned_at
      const unassignedId = (unassigned as unknown as { id: string }).id;
      const { error } = await supabase
        .from('partner_orgs_projects')
        .update({ unassigned_at: null } as never)
        .eq('id', unassignedId);

      if (error) {
        console.error('Error reactivating project partner org:', error);
        throw new Error(
          error.message || 'Failed to assign partner org to project'
        );
      }
    } else {
      // Create new assignment
      const { error } = await supabase.from('partner_orgs_projects').insert({
        project_id: projectId,
        partner_org_id: partnerOrgId,
        source_type: 'manual',
      } as never);

      if (error) {
        console.error('Error assigning partner org to project:', error);
        throw new Error(
          error.message || 'Failed to assign partner org to project'
        );
      }
    }
  },

  /**
   * Unassign partner org from project (soft delete)
   */
  async unassignPartnerOrgFromProject(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from('partner_orgs_projects')
      .update({ unassigned_at: new Date().toISOString() } as never)
      .eq('id', assignmentId);

    if (error) {
      console.error('Error unassigning partner org from project:', error);
      throw new Error(
        error.message || 'Failed to unassign partner org from project'
      );
    }
  },

  /**
   * Create a new project
   */
  async createProject(data: {
    name: string;
    description?: string | null;
    source_language_entity_id: string;
    target_language_entity_id: string;
    region_id?: string | null;
    location?: { lat: number; lng: number } | null;
    project_status?: Database['public']['Enums']['project_status'];
  }): Promise<ProjectWithDetails> {
    // Get current authenticated user for created_by field (required by RLS policy)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to create a project');
    }

    // Convert location to PostGIS format if provided
    const locationValue = data.location
      ? locationToPostGIS(data.location)
      : null;

    const insertData: Database['public']['Tables']['projects']['Insert'] = {
      name: data.name,
      description: data.description || null,
      source_language_entity_id: data.source_language_entity_id,
      target_language_entity_id: data.target_language_entity_id,
      region_id: data.region_id || null,
      project_status: data.project_status || 'precreated',
      publish_status: 'pending',
      location: locationValue,
      created_by: user.id,
    };

    const { data: project, error } = await supabase
      .from('projects')
      .insert(insertData)
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
      .single();

    if (error) throw error;

    // Extract location from PostGIS geometry
    const location = extractLocation(project.location);

    return {
      ...project,
      location,
      progress: null,
      textVersions: [],
      audioVersions: [],
    } as unknown as ProjectWithDetails;
  },
};
