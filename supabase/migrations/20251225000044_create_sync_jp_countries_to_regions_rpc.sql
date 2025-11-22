-- transform_jp_countries_cache_to_regions.sql
-- Transform jp_countries_cache into canonical regions table
-- Insert/update only - never deletes canonical table rows
CREATE OR REPLACE FUNCTION transform_jp_countries_cache_to_regions () returns TABLE (
  countries_processed BIGINT,
  countries_matched BIGINT,
  countries_created BIGINT,
  regions_updated BIGINT,
  sources_created BIGINT,
  aliases_created BIGINT,
  errors JSONB
) language plpgsql security definer
SET
  search_path = public AS $$
DECLARE
  v_countries_processed BIGINT := 0;
  v_countries_matched BIGINT := 0;
  v_countries_created BIGINT := 0;
  v_regions_updated BIGINT := 0;
  v_sources_created BIGINT := 0;
  v_aliases_created BIGINT := 0;
  v_errors JSONB := '[]'::JSONB;
  v_cache_row RECORD;
  v_region_id UUID;
  v_error_message TEXT;
  v_matched_by TEXT;
BEGIN
  -- Set timeout for large operations
  PERFORM set_config('statement_timeout', '300000', TRUE);

  -- Process all cache entries
  FOR v_cache_row IN
    SELECT *
    FROM jp_countries_cache
    WHERE deleted_at IS NULL
    ORDER BY rog3
  LOOP
    BEGIN
      v_countries_processed := v_countries_processed + 1;
      v_region_id := NULL;
      v_matched_by := NULL;

      -- ====================================================================
      -- MATCHING STRATEGY: Try multiple ways to find existing region
      -- ====================================================================

      -- Strategy 1: Match by ROG3 (FIPS) via region_sources
      IF v_cache_row.rog3 IS NOT NULL THEN
        SELECT r.id INTO v_region_id
        FROM regions r
        INNER JOIN region_sources rs ON rs.region_id = r.id
        WHERE rs.external_id_type = 'fips-10-4'
          AND rs.external_id = UPPER(v_cache_row.rog3)
          AND rs.is_external = TRUE
          AND rs.deleted_at IS NULL
          AND r.level = 'country'
          AND r.deleted_at IS NULL
        LIMIT 1;

        IF v_region_id IS NOT NULL THEN
          v_matched_by := 'rog3';
        END IF;
      END IF;

      -- Strategy 2: Match by ISO3 via region_sources
      IF v_region_id IS NULL AND v_cache_row.iso3 IS NOT NULL THEN
        SELECT r.id INTO v_region_id
        FROM regions r
        INNER JOIN region_sources rs ON rs.region_id = r.id
        WHERE rs.external_id_type = 'iso3166-1-alpha3'
          AND rs.external_id = UPPER(v_cache_row.iso3)
          AND rs.is_external = TRUE
          AND rs.deleted_at IS NULL
          AND r.level = 'country'
          AND r.deleted_at IS NULL
        LIMIT 1;

        IF v_region_id IS NOT NULL THEN
          v_matched_by := 'iso3';
        END IF;
      END IF;

      -- Strategy 3: Match by ISO2 via region_sources
      IF v_region_id IS NULL AND v_cache_row.iso2 IS NOT NULL THEN
        SELECT r.id INTO v_region_id
        FROM regions r
        INNER JOIN region_sources rs ON rs.region_id = r.id
        WHERE rs.external_id_type = 'iso3166-1-alpha2'
          AND rs.external_id = UPPER(v_cache_row.iso2)
          AND rs.is_external = TRUE
          AND rs.deleted_at IS NULL
          AND r.level = 'country'
          AND r.deleted_at IS NULL
        LIMIT 1;

        IF v_region_id IS NOT NULL THEN
          v_matched_by := 'iso2';
        END IF;
      END IF;

      -- Strategy 4: Match by name (case-insensitive)
      IF v_region_id IS NULL AND v_cache_row.ctry IS NOT NULL THEN
        SELECT id INTO v_region_id
        FROM regions
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_cache_row.ctry))
          AND level = 'country'
          AND deleted_at IS NULL
        LIMIT 1;

        IF v_region_id IS NOT NULL THEN
          v_matched_by := 'name';
        END IF;
      END IF;

      -- Strategy 5: Match by alias (case-insensitive)
      IF v_region_id IS NULL AND v_cache_row.ctry IS NOT NULL THEN
        SELECT r.id INTO v_region_id
        FROM regions r
        INNER JOIN region_aliases ra ON ra.region_id = r.id
        WHERE LOWER(TRIM(ra.alias_name)) = LOWER(TRIM(v_cache_row.ctry))
          AND r.level = 'country'
          AND ra.deleted_at IS NULL
          AND r.deleted_at IS NULL
        LIMIT 1;

        IF v_region_id IS NOT NULL THEN
          v_matched_by := 'alias';
        END IF;
      END IF;

      -- ====================================================================
      -- PROCESS MATCHED REGIONS
      -- ====================================================================
      IF v_region_id IS NOT NULL THEN
        v_countries_matched := v_countries_matched + 1;

        -- Update region name if JP name is different (but don't overwrite if JP name is null)
        IF v_cache_row.ctry IS NOT NULL THEN
          UPDATE regions
          SET updated_at = NOW()
          WHERE id = v_region_id
            AND LOWER(TRIM(name)) != LOWER(TRIM(v_cache_row.ctry));
        END IF;

        -- Create region_sources entries if missing
        -- ROG3 (FIPS)
        IF v_cache_row.rog3 IS NOT NULL THEN
          INSERT INTO region_sources (
            region_id,
            source,
            external_id_type,
            external_id,
            is_external
          )
          VALUES (
            v_region_id,
            'joshua_project',
            'fips-10-4',
            UPPER(v_cache_row.rog3),
            TRUE
          )
          ON CONFLICT DO NOTHING;
        END IF;

        -- ISO2
        IF v_cache_row.iso2 IS NOT NULL THEN
          INSERT INTO region_sources (
            region_id,
            source,
            external_id_type,
            external_id,
            is_external
          )
          VALUES (
            v_region_id,
            'joshua_project',
            'iso3166-1-alpha2',
            UPPER(v_cache_row.iso2),
            TRUE
          )
          ON CONFLICT DO NOTHING;
        END IF;

        -- ISO3
        IF v_cache_row.iso3 IS NOT NULL THEN
          INSERT INTO region_sources (
            region_id,
            source,
            external_id_type,
            external_id,
            is_external
          )
          VALUES (
            v_region_id,
            'joshua_project',
            'iso3166-1-alpha3',
            UPPER(v_cache_row.iso3),
            TRUE
          )
          ON CONFLICT DO NOTHING;
        END IF;

        -- Create region_aliases entry if JP country name doesn't match region name
        IF v_cache_row.ctry IS NOT NULL THEN
          -- Check if name differs
          IF NOT EXISTS (
            SELECT 1
            FROM regions
            WHERE id = v_region_id
              AND LOWER(TRIM(name)) = LOWER(TRIM(v_cache_row.ctry))
          ) THEN
            -- Check if alias already exists
            IF NOT EXISTS (
              SELECT 1
              FROM region_aliases
              WHERE region_id = v_region_id
                AND LOWER(TRIM(alias_name)) = LOWER(TRIM(v_cache_row.ctry))
                AND deleted_at IS NULL
            ) THEN
              INSERT INTO region_aliases (region_id, alias_name)
              VALUES (v_region_id, v_cache_row.ctry);

              v_aliases_created := v_aliases_created + 1;
            END IF;
          END IF;
        END IF;

        v_regions_updated := v_regions_updated + 1;
      ELSE
        -- ====================================================================
        -- CREATE NEW REGION FOR UNMATCHED COUNTRIES
        -- ====================================================================
        IF v_cache_row.ctry IS NOT NULL THEN
          -- Create new region
          INSERT INTO regions (
            name,
            level,
            parent_id
          )
          VALUES (
            v_cache_row.ctry,
            'country'::region_level,
            NULL
          )
          RETURNING id INTO v_region_id;

          v_countries_created := v_countries_created + 1;

          -- Create region_sources entries for all available codes
          -- ROG3 (FIPS)
          IF v_cache_row.rog3 IS NOT NULL THEN
            INSERT INTO region_sources (
              region_id,
              source,
              external_id_type,
              external_id,
              is_external
            )
            VALUES (
              v_region_id,
              'joshua_project',
              'fips-10-4',
              UPPER(v_cache_row.rog3),
              TRUE
            );

            v_sources_created := v_sources_created + 1;
          END IF;

          -- ISO2
          IF v_cache_row.iso2 IS NOT NULL THEN
            INSERT INTO region_sources (
              region_id,
              source,
              external_id_type,
              external_id,
              is_external
            )
            VALUES (
              v_region_id,
              'joshua_project',
              'iso3166-1-alpha2',
              UPPER(v_cache_row.iso2),
              TRUE
            );

            v_sources_created := v_sources_created + 1;
          END IF;

          -- ISO3
          IF v_cache_row.iso3 IS NOT NULL THEN
            INSERT INTO region_sources (
              region_id,
              source,
              external_id_type,
              external_id,
              is_external
            )
            VALUES (
              v_region_id,
              'joshua_project',
              'iso3166-1-alpha3',
              UPPER(v_cache_row.iso3),
              TRUE
            );

            v_sources_created := v_sources_created + 1;
          END IF;

          -- Create region_aliases entry with JP country name
          INSERT INTO region_aliases (region_id, alias_name)
          VALUES (v_region_id, v_cache_row.ctry);

          v_aliases_created := v_aliases_created + 1;
        ELSE
          -- Log error: country name is null, cannot create region
          v_error_message := format('Cannot create region for rog3=%s: country name is null', 
            v_cache_row.rog3);
          v_errors := v_errors || jsonb_build_object('type', 'missing_country_name', 'message', v_error_message);
        END IF;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue processing
        v_error_message := format('Error processing rog3=%s: %s', 
          v_cache_row.rog3, SQLERRM);
        v_errors := v_errors || jsonb_build_object('type', 'processing_error', 'message', v_error_message);
    END;
  END LOOP;

  -- Return summary
  RETURN QUERY SELECT
    v_countries_processed,
    v_countries_matched,
    v_countries_created,
    v_regions_updated,
    v_sources_created,
    v_aliases_created,
    v_errors;
END;
$$;


comment ON function transform_jp_countries_cache_to_regions () IS 'Transforms jp_countries_cache into canonical regions table. Matches countries by ROG3 (FIPS), ISO3, ISO2, name, or alias. Creates new regions for unmatched countries. Creates region_sources and region_aliases entries. Insert/update only - never deletes regions.';
