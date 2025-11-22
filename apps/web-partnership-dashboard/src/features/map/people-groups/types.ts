export interface PeopleGroupWithLocation {
  people_group_id: string;
  people_group_name: string;
  region_id: string;
  region_name: string;
  longitude: number;
  latitude: number;
  peop_name_in_country: string | null;
  // Stats from mv_people_group_stats
  population: number | null;
  language_count: number | null;
  country_count: number | null;
  primary_language_rol3: string | null;
  primary_language_name: string | null;
  primary_language_bible_status: number | null;
  image_url: string | null;
  jpscale: number | null;
  least_reached: boolean | null;
  frontier: boolean | null;
  primary_religion: string | null;
  percent_evangelical: number | null;
  percent_christian_pc: number | null;
  bible_status: number | null;
  has_audio_recordings: boolean | null;
  has_jesus_film: boolean | null;
  stats_computed_at: string | null;
}
