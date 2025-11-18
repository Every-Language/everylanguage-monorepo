import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export function useProjectProgress(
  projectId: string | 'all',
  partnerOrgId?: string
) {
  return useQuery({
    queryKey: ['project-progress', projectId, partnerOrgId],
    queryFn: async () => {
      if (projectId === 'all') {
        // Aggregate all projects for this partner org
        // Get project IDs first, then query audio_versions by project_id (more reliable)
        const { data: projects, error: projectsError } = await (supabase as any)
          .from('vw_partner_org_projects_via_donations')
          .select('project_id')
          .eq('partner_org_id', partnerOrgId!);

        if (projectsError) {
          console.error('Error fetching partner org projects:', projectsError);
          throw projectsError;
        }

        const projectIds =
          projects
            ?.map((p: any) => p.project_id)
            .filter((id: any): id is string => {
              // Filter out null, undefined, and ensure it's a valid UUID string
              return !!id && typeof id === 'string' && id.length > 0;
            }) || [];

        // Handle empty projectIds array to avoid 400 error
        if (projectIds.length === 0) {
          console.log('No project IDs found for partner org:', partnerOrgId);
          return [];
        }

        // Remove duplicates and ensure all are valid UUIDs
        const uniqueProjectIds = Array.from(new Set(projectIds));

        // Validate UUIDs (basic check - UUIDs are 36 chars with dashes)
        const validProjectIds = uniqueProjectIds.filter((id): id is string => {
          if (typeof id !== 'string') return false;
          const isValid =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              id
            );
          if (!isValid) {
            console.warn('Invalid project ID format:', id);
          }
          return isValid;
        });

        if (validProjectIds.length === 0) {
          console.log('No valid project IDs after validation');
          return [];
        }

        // Query audio_versions first
        const { data: audioVersions, error: versionsError } = (await supabase
          .from('audio_versions')
          .select('id, name, language_entity_id, project_id')
          .in('project_id', validProjectIds)
          .is('deleted_at', null)) as {
          data: Array<{
            id: string;
            name: string;
            language_entity_id: string | null;
            project_id: string | null;
          }> | null;
          error: { message: string } | null;
        };

        if (versionsError) {
          console.error('Error fetching audio versions:', versionsError);
          console.error('Project IDs attempted:', validProjectIds);
          throw versionsError;
        }

        // Query text versions for the same projects
        const { data: textVersions, error: textVersionsError } = (await supabase
          .from('text_versions')
          .select('id, name, language_entity_id, project_id')
          .in('project_id', validProjectIds)
          .is('deleted_at', null)) as {
          data: Array<{
            id: string;
            name: string;
            language_entity_id: string | null;
            project_id: string | null;
          }> | null;
          error: { message: string } | null;
        };

        if (textVersionsError) {
          console.error('Error fetching text versions:', textVersionsError);
          // Continue with just audio versions
        }

        // Query audio progress summaries separately (view doesn't support relationship syntax)
        const audioVersionIds = (audioVersions || [])
          .map(av => av.id)
          .filter((id): id is string => !!id);

        let audioSummaries: any[] | null = null;
        if (audioVersionIds.length > 0) {
          const { data: summariesData, error: summariesError } = await (
            supabase as any
          )
            .from('audio_version_progress_summary')
            .select(
              'audio_version_id, chapters_with_audio, total_chapters, books_complete, total_books, covered_verses, total_verses'
            )
            .in('audio_version_id', audioVersionIds);

          if (summariesError) {
            console.error(
              'Error fetching audio progress summaries:',
              summariesError
            );
          } else {
            audioSummaries = summariesData;
          }
        }

        // Query text progress summaries
        const textVersionIds = (textVersions || [])
          .map((tv: any) => tv.id)
          .filter((id: any): id is string => !!id);

        let textSummaries: any[] | null = null;
        if (textVersionIds.length > 0) {
          const { data: summariesData, error: summariesError } = await (
            supabase as any
          )
            .from('text_version_progress_summary')
            .select(
              'text_version_id, complete_chapters, total_chapters, books_complete, total_books, covered_verses, total_verses'
            )
            .in('text_version_id', textVersionIds);

          if (summariesError) {
            console.error(
              'Error fetching text progress summaries:',
              summariesError
            );
          } else {
            textSummaries = summariesData;
          }
        }

        // Combine audio and text versions with their summaries
        const allVersions: Array<{
          id: string;
          name: string;
          language_entity_id: string | null;
          project_id: string | null;
          version_type: 'audio' | 'text';
          progress_summary: unknown[];
        }> = [];

        // Add audio versions
        if (audioVersions && audioVersions.length > 0) {
          const audioSummaryMap = new Map<string, unknown>();
          if (audioSummaries) {
            for (const summary of audioSummaries) {
              audioSummaryMap.set(summary.audio_version_id as string, summary);
            }
          }
          for (const av of audioVersions) {
            allVersions.push({
              ...av,
              version_type: 'audio' as const,
              progress_summary:
                av.id && audioSummaryMap.has(av.id)
                  ? [audioSummaryMap.get(av.id)]
                  : [],
            });
          }
        }

        // Add text versions
        if (textVersions && textVersions.length > 0) {
          const textSummaryMap = new Map<string, unknown>();
          if (textSummaries) {
            for (const summary of textSummaries) {
              textSummaryMap.set(summary.text_version_id as string, summary);
            }
          }
          for (const tv of textVersions) {
            allVersions.push({
              ...tv,
              version_type: 'text' as const,
              progress_summary:
                tv.id && textSummaryMap.has(tv.id)
                  ? [textSummaryMap.get(tv.id)]
                  : [],
            });
          }
        }

        return allVersions;
      } else {
        // Single project
        const { data: audioVersions, error: versionsError } = (await supabase
          .from('audio_versions')
          .select('id, name, language_entity_id, project_id')
          .eq('project_id', projectId)
          .is('deleted_at', null)) as {
          data: Array<{
            id: string;
            name: string;
            language_entity_id: string | null;
            project_id: string | null;
          }> | null;
          error: { message: string } | null;
        };

        if (versionsError) throw versionsError;

        // Query text versions for the same project
        const { data: textVersions, error: textVersionsError } = (await supabase
          .from('text_versions')
          .select('id, name, language_entity_id, project_id')
          .eq('project_id', projectId)
          .is('deleted_at', null)) as {
          data: Array<{
            id: string;
            name: string;
            language_entity_id: string | null;
            project_id: string | null;
          }> | null;
          error: { message: string } | null;
        };

        if (textVersionsError) {
          console.error('Error fetching text versions:', textVersionsError);
          // Continue with just audio versions
        }

        // Query audio progress summaries separately
        const audioVersionIds = (audioVersions || [])
          .map(av => av.id)
          .filter((id): id is string => !!id);

        let audioSummaries: any[] | null = null;
        if (audioVersionIds.length > 0) {
          const { data: summariesData, error: summariesError } = await (
            supabase as any
          )
            .from('audio_version_progress_summary')
            .select(
              'audio_version_id, chapters_with_audio, total_chapters, books_complete, total_books, covered_verses, total_verses'
            )
            .in('audio_version_id', audioVersionIds);

          if (summariesError) {
            console.error(
              'Error fetching audio progress summaries:',
              summariesError
            );
          } else {
            audioSummaries = summariesData;
          }
        }

        // Query text progress summaries
        const textVersionIds = (textVersions || [])
          .map((tv: any) => tv.id)
          .filter((id: any): id is string => !!id);

        let textSummaries: any[] | null = null;
        if (textVersionIds.length > 0) {
          const { data: summariesData, error: summariesError } = await (
            supabase as any
          )
            .from('text_version_progress_summary')
            .select(
              'text_version_id, complete_chapters, total_chapters, books_complete, total_books, covered_verses, total_verses'
            )
            .in('text_version_id', textVersionIds);

          if (summariesError) {
            console.error(
              'Error fetching text progress summaries:',
              summariesError
            );
          } else {
            textSummaries = summariesData;
          }
        }

        // Combine audio and text versions with their summaries
        const allVersions: Array<{
          id: string;
          name: string;
          language_entity_id: string | null;
          project_id: string | null;
          version_type: 'audio' | 'text';
          progress_summary: unknown[];
        }> = [];

        // Add audio versions
        if (audioVersions && audioVersions.length > 0) {
          const audioSummaryMap = new Map<string, unknown>();
          if (audioSummaries) {
            for (const summary of audioSummaries) {
              audioSummaryMap.set(summary.audio_version_id as string, summary);
            }
          }
          for (const av of audioVersions) {
            allVersions.push({
              ...av,
              version_type: 'audio' as const,
              progress_summary:
                av.id && audioSummaryMap.has(av.id)
                  ? [audioSummaryMap.get(av.id)]
                  : [],
            });
          }
        }

        // Add text versions
        if (textVersions && textVersions.length > 0) {
          const textSummaryMap = new Map<string, unknown>();
          if (textSummaries) {
            for (const summary of textSummaries) {
              textSummaryMap.set(summary.text_version_id as string, summary);
            }
          }
          for (const tv of textVersions) {
            allVersions.push({
              ...tv,
              version_type: 'text' as const,
              progress_summary:
                tv.id && textSummaryMap.has(tv.id)
                  ? [textSummaryMap.get(tv.id)]
                  : [],
            });
          }
        }

        return allVersions;
      }
    },
    enabled: !!(projectId && (projectId !== 'all' || partnerOrgId)),
  });
}
