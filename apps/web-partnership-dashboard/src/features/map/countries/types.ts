export interface CountryWithBibleStatus {
  region_id: string;
  region_name: string;
  boundary_simplified: GeoJSON.MultiPolygon;
  language_count: number;
  languages_no_scripture: number;
  languages_portions: number;
  languages_new_testament: number;
  languages_full_bible: number;
  bible_status_score: number;
}
