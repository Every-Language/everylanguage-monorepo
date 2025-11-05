import type { Tables } from '@everylanguage/shared-types';

// Database types
export type LanguageEntity = Tables<'language_entities'>;
export type LanguageProperty = Tables<'language_properties'>;
export type LanguageAlias = Tables<'language_aliases'>;
export type Region = Tables<'regions'>;
export type RegionProperty = Tables<'region_properties'>;
export type RegionAlias = Tables<'region_aliases'>;

// Temporary types for sponsorships (until database types are regenerated)
export interface Sponsorship {
  id: string;
  partner_org_id: string | null;
  language_adoption_id: string | null;
  project_id: string | null;
  status: 'active' | 'pledged' | 'cancelled' | 'completed';
  pledge_one_time_cents: number | null;
  pledge_recurring_cents: number | null;
  currency_code: string;
  created_at: string;
  updated_at: string | null;
}

export interface SponsorshipAllocation {
  id: string;
  sponsorship_id: string;
  project_id: string;
  allocated_cents: number;
  allocation_date: string;
  created_at: string;
}

// Extended types with relations
export interface LanguageEntityWithRegions extends LanguageEntity {
  regions?: Region[];
  region_count?: number;
}

export interface LanguageHierarchyNode {
  hierarchy_entity_id: string;
  hierarchy_entity_name: string;
  hierarchy_entity_level: string;
  hierarchy_parent_id: string | null;
  relationship_type: 'self' | 'ancestor' | 'descendant' | 'sibling';
  generation_distance: number;
}

export interface RegionWithLanguages extends Region {
  language_entities?: LanguageEntity[];
  language_count?: number;
}

export interface RegionHierarchyNode {
  hierarchy_region_id: string;
  hierarchy_region_name: string;
  hierarchy_region_level: string;
  hierarchy_parent_id: string | null;
  relationship_type: 'self' | 'ancestor' | 'descendant' | 'sibling';
  generation_distance: number;
}

export interface SponsorshipWithDetails {
  id: string;
  partner_org_id: string | null;
  language_adoption_id: string | null;
  project_id: string | null;
  status: 'active' | 'pledged' | 'cancelled' | 'completed';
  pledge_one_time_cents: number | null;
  pledge_recurring_cents: number | null;
  currency_code: string;
  created_at: string;
  updated_at: string | null;
  partner_org?: {
    id: string;
    name: string;
  } | null;
  language_adoption?: {
    id: string;
    language_entity_id: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
}
