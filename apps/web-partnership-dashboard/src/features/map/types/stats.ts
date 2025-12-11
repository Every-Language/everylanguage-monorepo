/**
 * Type definitions for stats materialized views and contextual views
 */

// Primary stats types (from materialized views)
export type LanguageStats = {
  language_entity_id: string;
  language_name: string;
  iso639_3: string | null;
  rolv_code: string | null;
  bible_status: number | null;
  has_full_audio_bible: boolean;
  has_new_testament: boolean;
  has_portions: boolean;
  has_whole_bible: boolean;
  has_audio_recordings: boolean;
  has_audio_portions: boolean;
  has_jesus_film: boolean;
  population: number;
  least_reached_population: number;
  frontier_population: number;
  people_group_count: number;
  country_count: number;
  hub_country: string | null;
  jp_scale: number | null;
  percent_christian: number | null;
  percent_evangelical: number | null;
  primary_religion: string | null;
  religion_code: string | null;
  least_reached: string | null;
  status: string | null;
  country_code: string | null;
  translation_need_questionable: boolean | null;
  bible_year: string | null;
  nt_year: string | null;
  portions_year: string | null;
  fcbh_url: string | null;
  jf_url: string | null;
  grn_url: string | null;
  nbr_pgics: number | null;
  nbr_countries: number | null;
  computed_at: string;
};

export type RegionStats = {
  region_id: string;
  region_name: string;
  iso3: string | null;
  iso2: string | null;
  rog3: string | null;
  population: number;
  people_group_count: number;
  language_count: number;
  languages_no_scripture: number;
  languages_portions: number;
  languages_new_testament: number;
  languages_full_bible: number;
  percent_christianity: number | null;
  percent_islam: number | null;
  percent_buddhism: number | null;
  percent_hinduism: number | null;
  percent_ethnic_religions: number | null;
  percent_non_religious: number | null;
  percent_other_small: number | null;
  religion_primary: string | null;
  rlg3_primary: number | null;
  region_code: string | null;
  jp_region_name: string | null;
  continent_code: string | null;
  window_status: string | null;
  jpscale_ctry: number | null;
  jpscale_text: string | null;
  jpscale_image_url: string | null;
  security_level: number | null;
  capital: string | null;
  jp_country_name: string | null;
  computed_at: string;
};

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

// Contextual stats types (from views)
export type LanguageRegionStats = {
  region_id: string;
  language_entity_id: string;
  population: number;
  people_group_count: number;
  bible_status: number | null;
};

export type LanguagePeopleGroupStats = {
  language_entity_id: string;
  people_group_id: string;
  population: number;
  region_count: number;
  is_primary: boolean;
  bible_status: number | null;
};

export type PeopleGroupRegionStats = {
  region_id: string;
  people_group_id: string;
  population: number;
  language_count: number;
  name: string | null;
  primary_language_id: string | null;
};

// Audio recording types
export type LanguageRecording = {
  id: string;
  source: 'local' | 'grn';
  title: string;
  url: string;
  duration?: number | null;
  // Local recording fields
  bookName?: string | null;
  chapterNumber?: number | null;
  audioVersionId?: string | null;
  mediaFileId?: string | null;
  // GRN recording fields
  grnSetId?: number | null;
  grnTrackId?: number | null;
  grnProgramTitle?: string | null;
  grnVernacularTitle?: string | null;
  bibleReferences?: string | null;
};
