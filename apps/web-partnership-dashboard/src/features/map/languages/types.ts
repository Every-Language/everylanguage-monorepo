export interface LanguageWithLocation {
  language_entity_id: string;
  language_name: string;
  region_id: string;
  region_name: string;
  longitude: number;
  latitude: number;
  location_source: string | null;
  has_full_audio_bible: boolean | null;
  has_audio_portions: boolean | null;
  has_text_portions: boolean | null;
  iso639_3: string | null;
  rolv_code: string | null;
  bible_stats_computed_at: string | null;
}
