-- Fix transform_jp_people_groups_cache to use NOT EXISTS instead of ON CONFLICT
-- for people_groups_sources inserts, since there's no unique constraint on those columns
CREATE OR REPLACE FUNCTION transform_jp_people_groups_cache () returns TABLE (
  people_groups_created BIGINT,
  people_groups_updated BIGINT,
  people_groups_regions_created BIGINT,
  people_groups_regions_updated BIGINT,
  languages_linked BIGINT,
  languages_created BIGINT,
  unmatched_languages_count BIGINT,
  unmatched_regions_count BIGINT,
  errors JSONB
) language plpgsql security definer AS $$
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
BEGIN
  -- Process each cache entry
  -- Note: jp_people_groups_cache doesn't have deleted_at, we process all entries
  FOR v_cache_row IN
    SELECT *
    FROM jp_people_groups_cache
    ORDER BY people_id3_rog3
  LOOP
    BEGIN
      -- ====================================================================
      -- STEP 1: Create/update concept-level people_groups
      -- ====================================================================
      
      v_people_group_id := NULL;
      
      -- Check if people_group exists via people_groups_sources
      SELECT pg.id INTO v_people_group_id
      FROM people_groups pg
      INNER JOIN people_groups_sources pgs ON pgs.people_group_id = pg.id
      WHERE pgs.external_id_type = 'jp_people_id3'
        AND pgs.external_id = v_cache_row.people_id3::TEXT
        AND pgs.is_external = TRUE
        AND pgs.deleted_at IS NULL
        AND pg.deleted_at IS NULL
      LIMIT 1;
      
      IF v_people_group_id IS NULL THEN
        -- Create new people_group
        INSERT INTO people_groups (
          people_id3,
          name,
          population_pgac
        )
        VALUES (
          v_cache_row.people_id3,
          COALESCE(v_cache_row.peop_name_across_countries, v_cache_row.peop_name_in_country, 'Unknown'),
          v_cache_row.population_pgac
        )
        RETURNING id INTO v_people_group_id;
        
        v_people_groups_created := v_people_groups_created + 1;
      ELSE
        -- Update existing people_group
        UPDATE people_groups
        SET name = COALESCE(v_cache_row.peop_name_across_countries, v_cache_row.peop_name_in_country, name),
            population_pgac = COALESCE(v_cache_row.population_pgac, population_pgac),
            updated_at = NOW()
        WHERE id = v_people_group_id;
        
        v_people_groups_updated := v_people_groups_updated + 1;
      END IF;
      
      -- Create/update people_groups_sources entry (concept-level)
      -- Use NOT EXISTS instead of ON CONFLICT since there's no unique constraint
      IF NOT EXISTS (
        SELECT 1
        FROM people_groups_sources pgs
        WHERE pgs.people_group_id = v_people_group_id
          AND pgs.external_id_type = 'jp_people_id3'
          AND pgs.external_id = v_cache_row.people_id3::TEXT
          AND pgs.deleted_at IS NULL
      ) THEN
        INSERT INTO people_groups_sources (
          people_group_id,
          source,
          external_id_type,
          external_id,
          is_external
        )
        VALUES (
          v_people_group_id,
          'Joshua Project',
          'jp_people_id3',
          v_cache_row.people_id3::TEXT,
          TRUE
        );
      END IF;
      
      -- ====================================================================
      -- STEP 2: Create/update instance-level people_groups_regions
      -- ====================================================================
      
      v_region_id := NULL;
      v_people_group_region_id := NULL;
      
      -- Try ISO3 first (from region_sources)
      IF v_cache_row.iso3 IS NOT NULL THEN
        SELECT r.id INTO v_region_id
        FROM regions r
        INNER JOIN region_sources rs ON rs.region_id = r.id
        WHERE rs.external_id_type = 'iso3166-1-alpha3'
          AND rs.external_id = UPPER(v_cache_row.iso3)
          AND rs.is_external = TRUE
          AND rs.deleted_at IS NULL
          AND r.deleted_at IS NULL
        LIMIT 1;
      END IF;

      -- Try ROG3 (FIPS) if ISO3 didn't match
      IF v_region_id IS NULL AND v_cache_row.rog3 IS NOT NULL THEN
        SELECT r.id INTO v_region_id
        FROM regions r
        INNER JOIN region_sources rs ON rs.region_id = r.id
        WHERE rs.external_id_type = 'fips-10-4'
          AND rs.external_id = UPPER(v_cache_row.rog3)
          AND rs.is_external = TRUE
          AND rs.deleted_at IS NULL
          AND r.deleted_at IS NULL
        LIMIT 1;
      END IF;

      -- Track unmatched regions
      IF v_region_id IS NULL THEN
        v_unmatched_regions_count := v_unmatched_regions_count + 1;
        -- Log error but continue
        v_error_message := format('Unmatched region for people_id3_rog3=%s: iso3=%s, rog3=%s', 
          v_cache_row.people_id3_rog3, v_cache_row.iso3, v_cache_row.rog3);
        v_errors := v_errors || jsonb_build_object('type', 'unmatched_region', 'message', v_error_message);
      END IF;

      -- Skip region processing if region_id is NULL (unmatched region)
      IF v_region_id IS NOT NULL THEN
        -- Check if people_groups_regions exists
        SELECT id INTO v_people_group_region_id
        FROM people_groups_regions
        WHERE people_id3_rog3 = v_cache_row.people_id3_rog3
          AND deleted_at IS NULL
        LIMIT 1;

        IF v_people_group_region_id IS NULL THEN
          -- Create new people_groups_regions entry
          INSERT INTO people_groups_regions (
            people_group_id,
            region_id,
            people_id3_rog3,
            longitude,
            latitude,
            location_point,
            population,
            peop_name_in_country,
            primary_language_rol3
          )
          VALUES (
            v_people_group_id,
            v_region_id,
            v_cache_row.people_id3_rog3,
            v_cache_row.longitude,
            v_cache_row.latitude,
            CASE 
              WHEN v_cache_row.longitude IS NOT NULL AND v_cache_row.latitude IS NOT NULL
              THEN ST_SetSRID(ST_MakePoint(v_cache_row.longitude, v_cache_row.latitude), 4326)
              ELSE NULL
            END,
            v_cache_row.population,
            v_cache_row.peop_name_in_country,
            v_cache_row.rol3
          )
          RETURNING id INTO v_people_group_region_id;
          
          v_people_groups_regions_created := v_people_groups_regions_created + 1;
        ELSE
          -- Update existing people_groups_regions entry
          UPDATE people_groups_regions
          SET region_id = COALESCE(v_region_id, region_id),
              longitude = COALESCE(v_cache_row.longitude, longitude),
              latitude = COALESCE(v_cache_row.latitude, latitude),
              location_point = CASE 
                WHEN v_cache_row.longitude IS NOT NULL AND v_cache_row.latitude IS NOT NULL
                THEN ST_SetSRID(ST_MakePoint(v_cache_row.longitude, v_cache_row.latitude), 4326)
                ELSE location_point
              END,
              population = COALESCE(v_cache_row.population, population),
              peop_name_in_country = COALESCE(v_cache_row.peop_name_in_country, peop_name_in_country),
              primary_language_rol3 = COALESCE(v_cache_row.rol3, primary_language_rol3),
              updated_at = NOW()
          WHERE id = v_people_group_region_id;
          
          v_people_groups_regions_updated := v_people_groups_regions_updated + 1;
        END IF;

        -- Create/update people_groups_sources entry (instance-level)
        -- Use NOT EXISTS instead of ON CONFLICT since there's no unique constraint
        IF NOT EXISTS (
          SELECT 1
          FROM people_groups_sources pgs
          WHERE pgs.people_group_id = v_people_group_id
            AND pgs.external_id_type = 'jp_people_id3_rog3'
            AND pgs.external_id = v_cache_row.people_id3_rog3
            AND pgs.deleted_at IS NULL
        ) THEN
          INSERT INTO people_groups_sources (
            people_group_id,
            source,
            external_id_type,
            external_id,
            is_external
          )
          VALUES (
            v_people_group_id,
            'Joshua Project',
            'jp_people_id3_rog3',
            v_cache_row.people_id3_rog3,
            TRUE
          );
        END IF;
      END IF;

      -- ====================================================================
      -- STEP 3: Link languages to instance
      -- ====================================================================
      
      IF v_cache_row.rol3 IS NOT NULL AND v_people_group_region_id IS NOT NULL THEN
        v_language_entity_id := NULL;
        
        -- Try to find language_entity via language_properties (ISO 639-3)
        SELECT le.id INTO v_language_entity_id
        FROM language_entities le
        INNER JOIN language_properties lp ON lp.language_entity_id = le.id
        WHERE lp.key = 'iso639-3'
          AND lp.value = UPPER(v_cache_row.rol3)
          AND lp.deleted_at IS NULL
          AND le.deleted_at IS NULL
        LIMIT 1;

        -- If not found, check jp_language_cache
        IF v_language_entity_id IS NULL THEN
          SELECT les.language_entity_id INTO v_language_entity_id
          FROM jp_language_cache jlc
          INNER JOIN language_entity_sources les ON les.external_id = LOWER(jlc.iso639_3)
            AND les.external_id_type = 'iso-639-3'
            AND les.is_external = TRUE
            AND les.deleted_at IS NULL
          WHERE LOWER(jlc.iso639_3) = LOWER(v_cache_row.rol3)
          LIMIT 1;
        END IF;

        -- If still not found, auto-create language_entity
        IF v_language_entity_id IS NULL THEN
          -- Create language_entity
          INSERT INTO language_entities (
            name,
            level
          )
          VALUES (
            COALESCE(v_cache_row.primary_language_name, v_cache_row.rol3, 'Unknown'),
            'language'
          )
          RETURNING id INTO v_language_entity_id;
          
          -- Create language_property with ISO 639-3 code
          INSERT INTO language_properties (
            language_entity_id,
            key,
            value
          )
          VALUES (
            v_language_entity_id,
            'iso639-3',
            UPPER(v_cache_row.rol3)
          );
          
          -- Create language_entity_sources entry
          INSERT INTO language_entity_sources (
            language_entity_id,
            source,
            external_id_type,
            external_id,
            is_external
          )
          VALUES (
            v_language_entity_id,
            'Joshua Project',
            'iso-639-3',
            UPPER(v_cache_row.rol3),
            TRUE
          );
          
          v_languages_created := v_languages_created + 1;
        END IF;

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
      ELSIF v_cache_row.rol3 IS NOT NULL AND v_people_group_region_id IS NULL THEN
        -- Language specified but region was unmatched, so we can't link
        v_unmatched_languages_count := v_unmatched_languages_count + 1;
        v_error_message := format('Cannot link language for people_id3_rog3=%s: rol3=%s (region unmatched)', 
          v_cache_row.people_id3_rog3, v_cache_row.rol3);
        v_errors := v_errors || jsonb_build_object('type', 'unmatched_language', 'message', v_error_message);
      ELSIF v_cache_row.rol3 IS NULL THEN
        -- No language specified
        v_unmatched_languages_count := v_unmatched_languages_count + 1;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue processing
        v_error_message := format('Error processing people_id3_rog3=%s: %s', 
          v_cache_row.people_id3_rog3, SQLERRM);
        v_errors := v_errors || jsonb_build_object('type', 'processing_error', 'message', v_error_message);
    END;
  END LOOP;
  
  -- Return summary
  RETURN QUERY SELECT
    v_people_groups_created,
    v_people_groups_updated,
    v_people_groups_regions_created,
    v_people_groups_regions_updated,
    v_languages_linked,
    v_languages_created,
    v_unmatched_languages_count,
    v_unmatched_regions_count,
    v_errors;
END;
$$;
