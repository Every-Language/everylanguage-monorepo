/**
 * Type definitions for database materialized views and cache tables
 * that are not included in the generated Supabase types
 */

// Type for people_groups_stats materialized view
export type PeopleGroupStats = {
  people_group_id: string;
  people_id3: number;
  name: string;
  population: number;
  language_count: number;
  country_count: number;
  primary_language_rol3: string | null;
  primary_language_name: string | null;
  primary_language_bible_status: number | null;
  primary_language_has_whole_bible: boolean | null;
  primary_language_has_new_testament: boolean | null;
  primary_language_has_portions: boolean | null;
  image_url: string | null;
  jpscale: number | null;
  least_reached: boolean;
  frontier: boolean;
  primary_religion: string | null;
  rlg3: string | null;
  percent_evangelical: number | null;
  percent_christian_pc: number | null;
  percent_christian_pd: number | null;
  bible_status: number | null;
  bible_year: string | null;
  nt_year: string | null;
  portions_year: string | null;
  has_audio_recordings: boolean;
  has_jesus_film: boolean;
  jf: boolean;
  grn: boolean;
  peop_name_in_country: string | null;
  peop_name_across_countries: string | null;
  affinity_bloc: string | null;
  people_cluster: string | null;
  computed_at: string;
};

// Type for grn_language_cache table
export type GrnLanguageCache = {
  alternate_names: unknown | null;
  audio_sample: boolean | null;
  created_at: string;
  grn_language_id: number;
  has_recordings: boolean;
  id: string;
  ietf: string | null;
  iso639_3: string | null;
  language_name: string;
  last_synced_at: string;
  media_ids: unknown | null;
  name_ietf: string | null;
  parent_id: number | null;
  program_count: number | null;
  programs: unknown | null;
  updated_at: string;
};

// Type for region_stats materialized view
export type JPCountryCache = {
  region_id: string;
  rog3: string | null;
  region_name: string;
  region_code: string | null;
  jp_region_name: string | null;
  continent_code: string | null;
  continent_name: string | null;
  window_status: string | null;
  iso3: string | null;
  iso2: string | null;
  population: number | null;
  religion_primary: string | null;
  rlg3_primary: number | null;
  percent_christianity: number | null;
  percent_islam: number | null;
  percent_buddhism: number | null;
  percent_ethnic_religions: number | null;
  percent_hinduism: number | null;
  percent_non_religious: number | null;
  percent_other_small: number | null;
  security_level?: number;
  jpscale_ctry?: number | null;
  jpscale_text?: string | null;
  jpscale_image_url?: string | null;
  people_group_count?: number | null;
  language_count?: number | null;
  languages_no_scripture?: number | null;
  languages_portions?: number | null;
  languages_new_testament?: number | null;
  languages_full_bible?: number | null;
};

// Type for language_stats materialized view
export type JPLanguageCache = {
  language_entity_id: string;
  iso639_3: string | null;
  language_name: string | null;
  rolv_code: string | null;
  bible_status: number | null;
  bible_year: string | number | null;
  nt_year: string | number | null;
  portions_year: string | number | null;
  has_audio_recordings: boolean | null;
  has_jesus_film: boolean | null;
  hub_country: string | null;
  jp_scale: number | null;
  percent_adherents: number | null;
  percent_evangelical: number | null;
  percent_christian: number | null;
  primary_religion: string | null;
  religion_code: string | number | null;
  least_reached: boolean | null;
  status: string | null;
  country_code: string | null;
  translation_need_questionable: boolean | null;
  fcbh_url: string | null;
  jf_url: string | null;
  grn_url: string | null;
  nbr_pgics: number | null;
  nbr_countries: number | null;
  population: number | null;
  least_reached_population: number | null;
  frontier_population: number | null;
  country_count?: number | null;
  people_group_count?: number | null;
};
