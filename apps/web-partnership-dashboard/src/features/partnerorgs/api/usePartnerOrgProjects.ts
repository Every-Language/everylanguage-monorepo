import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import type { PartnerOrgProject } from '../types';

export function usePartnerOrgProjects(partnerOrgId: string) {
  return useQuery({
    queryKey: ['partner-org-projects', partnerOrgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('partner_orgs_projects')
        .select(
          `
          partner_org_id,
          project_id,
          project:projects (
            name,
            description,
            target_language_entity_id,
            language_entity:language_entities!target_language_entity_id (
              id,
              name
            )
          )
          `
        )
        .eq('partner_org_id', partnerOrgId)
        .is('unassigned_at', null);

      if (error) throw error;

      // Transform the data to match PartnerOrgProject interface
      const transformed = (data ?? []).map((row: any) => {
        const project = row.project;
        const languageEntity = project?.language_entity;

        return {
          partner_org_id: row.partner_org_id,
          project_id: row.project_id,
          project_name: project?.name || '',
          project_description: project?.description || null,
          language_entity_id: project?.target_language_entity_id || '',
          language_name: languageEntity?.name || '',
        } as PartnerOrgProject;
      });

      // Sort by language_name
      transformed.sort((a: PartnerOrgProject, b: PartnerOrgProject) =>
        a.language_name.localeCompare(b.language_name)
      );

      return transformed;
    },
    enabled: !!partnerOrgId,
    staleTime: 5 * 60 * 1000, // 5 minutes - project lists are relatively static
  });
}
