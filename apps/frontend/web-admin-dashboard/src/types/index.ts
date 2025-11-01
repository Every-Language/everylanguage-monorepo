import type { Tables } from '@everylanguage/shared-types';

// Database types
export type LanguageEntity = Tables<'language_entities'>;
export type LanguageEntityVersion = Tables<'language_entity_versions'>;
export type Region = Tables<'regions'>;
export type RegionVersion = Tables<'region_versions'>;
export type Sponsorship = Tables<'sponsorships'>;
export type SponsorshipAllocation = Tables<'sponsorship_allocations'>;

// Extended types with relations
export interface LanguageEntityWithRegions extends LanguageEntity {
  regions?: Region[];
  region_count?: number;
}

export interface RegionWithLanguages extends Region {
  language_entities?: LanguageEntity[];
  language_count?: number;
}

export interface SponsorshipWithDetails extends Sponsorship {
  partner_org?: {
    id: string;
    name: string;
  };
  language_adoption?: {
    id: string;
    language_entity_id: string;
  };
  project?: {
    id: string;
    name: string;
  };
}
