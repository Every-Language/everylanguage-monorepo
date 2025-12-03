-- 20251225000048_drop_jp_language_people_groups_stats.sql
-- Drop jp_language_people_groups_stats materialized view
-- This MV is being replaced by mv_language_stats which includes aggregated people groups stats
BEGIN;


-- Drop the materialized view
DROP MATERIALIZED VIEW IF EXISTS jp_language_people_groups_stats;


-- Remove refresh call from old transform function (if it still exists)
-- The newer batch processing version (20251225000046) already doesn't have this call
-- But we update the old function signature just in case
CREATE OR REPLACE FUNCTION transform_jp_people_groups_cache () returns TABLE (
  people_groups_created BIGINT,
  people_groups_updated BIGINT,
  people_groups_regions_created BIGINT,
  people_groups_regions_updated BIGINT,
  languages_linked BIGINT,
  languages_created BIGINT,
  unmatched_languages_count BIGINT,
  unmatched_regions_count BIGINT,
  errors JSONB,
  processed_count BIGINT,
  total_remaining BIGINT
) language plpgsql AS $$
DECLARE
  v_cache_row RECORD;
  v_people_group_id UUID;
  v_people_group_region_id UUID;
  v_region_id UUID;
  v_language_entity_id UUID;
  v_people_groups_created BIGINT := 0;
  v_people_groups_updated BIGINT := 0;
  v_people_groups_regions_created BIGINT := 0;
  v_people_groups_regions_updated BIGINT := 0;
  v_languages_linked BIGINT := 0;
  v_languages_created BIGINT := 0;
  v_unmatched_languages_count BIGINT := 0;
  v_unmatched_regions_count BIGINT := 0;
  v_errors JSONB := '[]'::JSONB;
  v_error_message TEXT;
  v_processed_count BIGINT := 0;
  v_total_remaining BIGINT;
BEGIN
  -- Process all cache entries
  FOR v_cache_row IN
    SELECT * FROM jp_people_groups_cache
    ORDER BY people_id3_rog3
  LOOP
    BEGIN
      -- Find or create people group
      SELECT id INTO v_people_group_id
      FROM people_groups
      WHERE people_id3 = v_cache_row.people_id3;
      
      IF v_people_group_id IS NULL THEN
        INSERT INTO people_groups (people_id3, name)
        VALUES (v_cache_row.people_id3, v_cache_row.peop_name_across_countries)
        RETURNING id INTO v_people_group_id;
        v_people_groups_created := v_people_groups_created + 1;
      ELSE
        UPDATE people_groups
        SET name = COALESCE(v_cache_row.peop_name_across_countries, name)
        WHERE id = v_people_group_id;
        v_people_groups_updated := v_people_groups_updated + 1;
      END IF;
      
      -- Find region by FIPS code (rog3) or ISO3
      SELECT r.id INTO v_region_id
      FROM regions r
      JOIN region_sources rs ON rs.region_id = r.id
      WHERE r.level = 'country'
        AND (
          (rs.external_id_type = 'fips' AND rs.external_id = v_cache_row.rog3)
          OR (rs.external_id_type = 'iso-3166-1-alpha-3' AND rs.external_id = v_cache_row.iso3)
        )
        AND rs.deleted_at IS NULL
        AND r.deleted_at IS NULL
      LIMIT 1;
      
      IF v_region_id IS NULL THEN
        v_unmatched_regions_count := v_unmatched_regions_count + 1;
        v_error_message := format('Unmatched region for people_id3_rog3=%s: rog3=%s, iso3=%s', 
          v_cache_row.people_id3_rog3, v_cache_row.rog3, v_cache_row.iso3);
        v_errors := v_errors || jsonb_build_object('type', 'unmatched_region', 'message', v_error_message);
      ELSE
        -- Find or create people_group_region
        SELECT id INTO v_people_group_region_id
        FROM people_groups_regions
        WHERE people_group_id = v_people_group_id
          AND region_id = v_region_id;
        
        IF v_people_group_region_id IS NULL THEN
          INSERT INTO people_groups_regions (people_group_id, region_id, people_id3_rog3)
          VALUES (v_people_group_id, v_region_id, v_cache_row.people_id3_rog3)
          RETURNING id INTO v_people_group_region_id;
          v_people_groups_regions_created := v_people_groups_regions_created + 1;
        ELSE
          UPDATE people_groups_regions
          SET people_id3_rog3 = v_cache_row.people_id3_rog3
          WHERE id = v_people_group_region_id;
          v_people_groups_regions_updated := v_people_groups_regions_updated + 1;
        END IF;
        
        -- Link language if available
        IF v_cache_row.rol3 IS NOT NULL AND v_people_group_region_id IS NOT NULL THEN
          SELECT le.id INTO v_language_entity_id
          FROM language_entities le
          JOIN language_entity_sources les ON les.language_entity_id = le.id
          WHERE les.external_id_type = 'iso-639-3'
            AND LOWER(les.external_id) = LOWER(v_cache_row.rol3)
            AND les.deleted_at IS NULL
            AND le.deleted_at IS NULL
          LIMIT 1;
          
          IF v_language_entity_id IS NOT NULL THEN
            -- Link language to people_group_region
            INSERT INTO language_entities_people_groups_regions (
              language_entity_id,
              people_group_region_id,
              is_primary
            )
            VALUES (
              v_language_entity_id,
              v_people_group_region_id,
              TRUE
            )
            ON CONFLICT (language_entity_id, people_group_region_id) DO NOTHING;
            
            v_languages_linked := v_languages_linked + 1;
          ELSE
            v_unmatched_languages_count := v_unmatched_languages_count + 1;
            v_error_message := format('Unmatched language for people_id3_rog3=%s: rol3=%s', 
              v_cache_row.people_id3_rog3, v_cache_row.rol3);
            v_errors := v_errors || jsonb_build_object('type', 'unmatched_language', 'message', v_error_message);
          END IF;
        ELSIF v_cache_row.rol3 IS NOT NULL AND v_people_group_region_id IS NULL THEN
          v_unmatched_languages_count := v_unmatched_languages_count + 1;
          v_error_message := format('Cannot link language for people_id3_rog3=%s: rol3=%s (region unmatched)', 
            v_cache_row.people_id3_rog3, v_cache_row.rol3);
          v_errors := v_errors || jsonb_build_object('type', 'unmatched_language', 'message', v_error_message);
        ELSIF v_cache_row.rol3 IS NULL THEN
          v_unmatched_languages_count := v_unmatched_languages_count + 1;
        END IF;
      END IF;
      
      v_processed_count := v_processed_count + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        v_error_message := format('Error processing people_id3_rog3=%s: %s', 
          v_cache_row.people_id3_rog3, SQLERRM);
        v_errors := v_errors || jsonb_build_object('type', 'processing_error', 'message', v_error_message);
    END;
  END LOOP;
  
  -- Calculate remaining count
  SELECT COUNT(*) INTO v_total_remaining
  FROM jp_people_groups_cache
  WHERE people_id3_rog3 NOT IN (
    SELECT people_id3_rog3
    FROM people_groups_regions
    WHERE people_id3_rog3 IS NOT NULL
  );
  
  -- Return summary (removed refresh call for jp_language_people_groups_stats)
  RETURN QUERY SELECT
    v_people_groups_created,
    v_people_groups_updated,
    v_people_groups_regions_created,
    v_people_groups_regions_updated,
    v_languages_linked,
    v_languages_created,
    v_unmatched_languages_count,
    v_unmatched_regions_count,
    v_errors,
    v_processed_count,
    v_total_remaining;
END;
$$;


COMMIT;
