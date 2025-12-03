-- 20251225000065_add_get_countries_with_bible_status_rpc.sql
-- Create RPC function to fetch all countries with their boundaries and calculated bible status scores
-- Used for rendering countries layer on map with bible translation status colors
BEGIN;


CREATE OR REPLACE FUNCTION get_countries_with_bible_status () returns TABLE (
  region_id UUID,
  region_name TEXT,
  boundary_simplified geometry (multipolygon, 4326),
  language_count INTEGER,
  languages_no_scripture INTEGER,
  languages_portions INTEGER,
  languages_new_testament INTEGER,
  languages_full_bible INTEGER,
  bible_status_score NUMERIC
) AS $$
  SELECT 
    r.id AS region_id,
    r.name AS region_name,
    COALESCE(r.boundary_simplified, ST_Multi(ST_CollectionExtract(r.boundary, 3))) AS boundary_simplified,
    COALESCE(mrs.language_count, 0) AS language_count,
    COALESCE(mrs.languages_no_scripture, 0) AS languages_no_scripture,
    COALESCE(mrs.languages_portions, 0) AS languages_portions,
    COALESCE(mrs.languages_new_testament, 0) AS languages_new_testament,
    COALESCE(mrs.languages_full_bible, 0) AS languages_full_bible,
    CASE 
      WHEN mrs.language_count > 0 THEN
        (
          (COALESCE(mrs.languages_no_scripture, 0) * 0.0) +
          (COALESCE(mrs.languages_portions, 0) * 2.0) +
          (COALESCE(mrs.languages_new_testament, 0) * 3.0) +
          (COALESCE(mrs.languages_full_bible, 0) * 4.0)
        )::NUMERIC / mrs.language_count
      ELSE 0
    END AS bible_status_score
  FROM regions r
  LEFT JOIN mv_region_stats mrs ON mrs.region_id = r.id
  WHERE r.level = 'country'
    AND r.deleted_at IS NULL
    AND (r.boundary IS NOT NULL OR r.boundary_simplified IS NOT NULL)
$$ language sql stable;


comment ON function get_countries_with_bible_status () IS 'Returns all countries with their simplified boundaries and calculated weighted average bible status scores (0-4 scale). Used for rendering countries layer on map colored by bible translation status.';


COMMIT;
