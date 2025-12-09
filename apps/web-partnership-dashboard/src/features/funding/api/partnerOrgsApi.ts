import { supabase } from '@/shared/services/supabase';

/**
 * Fetch user's linked partner orgs for dropdown
 * Returns partner orgs where user has a role (partner_admin, partner_leader, partner_member)
 * or where user is the creator
 */
export async function fetchUserLinkedPartnerOrgs(): Promise<
  Array<{
    id: string;
    name: string;
    description: string | null;
    is_individual: boolean;
  }>
> {
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  // Query partner orgs where user has a role using user_partner_orgs view
  const { data: orgsWithRoles, error: rolesError } = await (supabase as any)
    .from('user_partner_orgs')
    .select('id, name, description, is_individual')
    .order('name', { ascending: true });

  // Query partner orgs where user is the creator
  const { data: createdOrgs, error: createdError } = await (supabase as any)
    .from('partner_orgs')
    .select('id, name, description, is_individual')
    .eq('created_by', user.id)
    .order('name', { ascending: true });

  if (rolesError || createdError) {
    console.error(
      'Error fetching user linked partner orgs:',
      rolesError || createdError
    );
    return [];
  }

  // Combine and remove duplicates
  const uniqueOrgs = new Map<string, any>();

  (orgsWithRoles || []).forEach((org: any) => {
    if (!uniqueOrgs.has(org.id)) {
      uniqueOrgs.set(org.id, {
        id: org.id,
        name: org.name,
        description: org.description,
        is_individual: org.is_individual,
      });
    }
  });

  (createdOrgs || []).forEach((org: any) => {
    if (!uniqueOrgs.has(org.id)) {
      uniqueOrgs.set(org.id, {
        id: org.id,
        name: org.name,
        description: org.description,
        is_individual: org.is_individual,
      });
    }
  });

  return Array.from(uniqueOrgs.values());
}

/**
 * Find user's individual partner org (where created_by = user_id AND is_individual = true)
 */
export async function findUserIndividualPartnerOrg(): Promise<{
  id: string;
  name: string;
  description: string | null;
} | null> {
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await (supabase as any)
    .from('partner_orgs')
    .select('id, name, description')
    .eq('created_by', user.id)
    .eq('is_individual', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error finding user individual partner org:', error);
    return null;
  }

  // Return the most recent individual org, or null if none found
  return data && data.length > 0 ? data[0] : null;
}
