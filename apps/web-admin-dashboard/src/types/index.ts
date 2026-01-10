import type { Tables, Enums } from '@everylanguage/shared-types';

// Database types
export type LanguageEntity = Tables<'language_entities'>;
export type LanguageProperty = Tables<'language_properties'>;
export type LanguageAlias = Tables<'language_aliases'>;
export type Region = Tables<'regions'>;
export type RegionProperty = Tables<'region_properties'>;
export type RegionAlias = Tables<'region_aliases'>;
export type Donation = Tables<'donations'>;
export type DonationAllocation = Tables<'donation_allocations'>;
export type Operation = Tables<'operations'>;
export type Project = Tables<'projects'>;

// Enum types
export type EntityStatus = Enums<'entity_status'> | 'in_progress'; // 'in_progress' added in migration, will be in types after regeneration

// Funding status types
export type LanguageFundingStatus =
  | 'draft'
  | 'available'
  | 'in_progress'
  | 'funded'
  | 'archived';
export type RegionFundingStatus =
  | 'not_started'
  | 'available'
  | 'in_progress'
  | 'funded'
  | 'archived';

// Funding interfaces
export interface LanguageFunding {
  id: string;
  language_entity_id: string;
  funding_status: LanguageFundingStatus;
  budget_cents: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

export interface RegionFunding {
  region_id: string;
  region_name: string;
  region_level: string;
  budget_cents: number;
  funding_status: RegionFundingStatus;
}

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
  language_funding?: LanguageFunding | null;
  population?: number | null; // Population from language_stats
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
  region_funding?: RegionFunding | null;
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

// Donation types
export interface DonationWithAllocations extends Donation {
  allocations: DonationAllocationWithNested[];
  allocated_cents: number;
  remaining_cents: number;
  intent_language?: LanguageEntity | null;
  intent_region?: Region | null;
  intent_operation?: Operation | null;
  partner_org?: {
    id: string;
    name: string;
  } | null;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  is_manual?: boolean;
}

export interface AllocationWithDetails extends DonationAllocation {
  donation?: Donation | null;
  operation?: Operation | null;
  project?: Project | null;
  created_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

// Type for donation allocation with nested operation and project data from Supabase query
export interface DonationAllocationWithNested extends DonationAllocation {
  operation?: { id: string; name: string; category: string } | null;
  project?: {
    id: string;
    name: string;
    target_language_entity_id: string | null;
    target_language?: { id: string; name: string; level: string } | null;
  } | null;
}

// Subscription types
export type Subscription = Tables<'subscriptions'>;
export type SubscriptionStatus = Enums<'subscription_status'>;

export interface SubscriptionWithDonations extends Subscription {
  donations: DonationWithAllocations[];
  intent_language?: LanguageEntity | null;
  intent_region?: Region | null;
  intent_operation?: Operation | null;
  partner_org?: {
    id: string;
    name: string;
  } | null;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}
