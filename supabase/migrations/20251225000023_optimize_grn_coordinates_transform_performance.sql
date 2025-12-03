-- 20251225000023_optimize_grn_coordinates_transform_performance.sql
-- Optimize the transform function to use DISTINCT ON instead of correlated subquery
-- This improves performance when processing large datasets
CREATE OR REPLACE FUNCTION transform_grn_coordinates_cache_to_language_entities_regions () returns TABLE (
  processed INTEGER,
  matched INTEGER,
  skipped_no_language_entity INTEGER,
  skipped_no_region INTEGER,
  upserted INTEGER
) language plpgsql security definer
SET
  search_path = public AS $$
DECLARE
  v_processed INTEGER := 0;
  v_matched INTEGER := 0;
  v_skipped_no_language_entity INTEGER := 0;
  v_skipped_no_region INTEGER := 0;
  v_upserted INTEGER := 0;
BEGIN
  -- Process cache entries with matching logic and upsert
  WITH
    -- Get language_entity_ids from GRN numbers
    language_matches AS (
      SELECT DISTINCT
        c.grn_number,
        les.language_entity_id
      FROM
        grn_language_coordinates_cache c
        INNER JOIN language_entity_sources les ON les.external_id = c.grn_number::TEXT
          AND les.external_id_type IN (
            'grn_language_number',
            'grn_language_id',
            'grn_id',
            'grn',
            'rolv_code'
          )
          AND les.is_external = TRUE
          AND les.deleted_at IS NULL
    ),
    -- Match country names to region_ids using multiple strategies
    region_matches AS (
      SELECT DISTINCT
        c.country_name,
        COALESCE(
          -- Strategy 1: Exact match on regions.name (case-insensitive)
          (
            SELECT r.id
            FROM regions r
            WHERE LOWER(TRIM(r.name)) = LOWER(TRIM(c.country_name))
              AND r.level = 'country'
              AND r.deleted_at IS NULL
            LIMIT 1
          ),
          -- Strategy 2: Match via region_aliases (case-insensitive)
          (
            SELECT r.id
            FROM region_aliases ra
              INNER JOIN regions r ON ra.region_id = r.id
            WHERE LOWER(TRIM(ra.alias_name)) = LOWER(TRIM(c.country_name))
              AND r.level = 'country'
              AND ra.deleted_at IS NULL
              AND r.deleted_at IS NULL
            LIMIT 1
          ),
          -- Strategy 3: Match via ISO codes in region_sources (if available)
          NULL
        ) AS region_id
      FROM
        grn_language_coordinates_cache c
    ),
    -- Combine matches
    matched_data AS (
      SELECT
        c.id AS cache_id,
        c.grn_number,
        c.country_name,
        c.location,
        lm.language_entity_id,
        rm.region_id
      FROM
        grn_language_coordinates_cache c
        LEFT JOIN language_matches lm ON c.grn_number = lm.grn_number
        LEFT JOIN region_matches rm ON c.country_name = rm.country_name
    ),
    -- Prepare upserts (only where both matches found) - Use DISTINCT ON for better performance
    to_upsert AS (
      SELECT DISTINCT ON (md.language_entity_id, md.region_id)
        md.language_entity_id,
        md.region_id,
        md.location
      FROM
        matched_data md
      WHERE
        md.language_entity_id IS NOT NULL
        AND md.region_id IS NOT NULL
        AND md.location IS NOT NULL
      ORDER BY md.language_entity_id, md.region_id, md.cache_id
    ),
    -- Count statistics
    stats AS (
      SELECT
        COUNT(*) AS total_processed,
        COUNT(*) FILTER (
          WHERE language_entity_id IS NOT NULL
            AND region_id IS NOT NULL
        ) AS total_matched,
        COUNT(*) FILTER (WHERE language_entity_id IS NULL) AS total_skipped_lang,
        COUNT(*) FILTER (
          WHERE language_entity_id IS NOT NULL
            AND region_id IS NULL
        ) AS total_skipped_region
      FROM
        matched_data
    )
  -- Upsert into language_entities_regions
  INSERT INTO language_entities_regions (
    language_entity_id,
    region_id,
    location,
    location_source,
    updated_at
  )
  SELECT
    tu.language_entity_id,
    tu.region_id,
    tu.location,
    'GRN',
    NOW()
  FROM
    to_upsert tu
  ON CONFLICT (language_entity_id, region_id) DO UPDATE SET
    -- Only update if location_source is NULL or 'GRN' (preserve manual entries)
    location = CASE
      WHEN language_entities_regions.location_source IS NULL
      OR language_entities_regions.location_source = 'GRN' THEN EXCLUDED.location
      ELSE language_entities_regions.location
    END,
    location_source = CASE
      WHEN language_entities_regions.location_source IS NULL
      OR language_entities_regions.location_source = 'GRN' THEN 'GRN'
      ELSE language_entities_regions.location_source
    END,
    updated_at = CASE
      WHEN language_entities_regions.location_source IS NULL
      OR language_entities_regions.location_source = 'GRN' THEN NOW()
      ELSE language_entities_regions.updated_at
    END
  WHERE
    language_entities_regions.location_source IS NULL
    OR language_entities_regions.location_source = 'GRN';

  -- Track unmatched entries in grn_coordinates_unmatched table
  -- Delete existing unmatched entries for cache entries we're processing (to refresh)
  DELETE FROM grn_coordinates_unmatched
  WHERE cache_id IN (
    SELECT id FROM grn_language_coordinates_cache
    WHERE grn_number IS NOT NULL 
      AND country_name IS NOT NULL 
      AND location IS NOT NULL
  );

  -- Insert unmatched entries using matched_data CTE logic
  -- We need to recalculate matched_data since we can't reference CTEs after INSERT
  INSERT INTO grn_coordinates_unmatched (
    cache_id,
    grn_number,
    language_name,
    iso_code,
    country_name,
    skip_reason
  )
  SELECT
    c.id,
    c.grn_number,
    c.language_name,
    c.iso_code,
    c.country_name,
    CASE
      WHEN NOT EXISTS (
        SELECT 1
        FROM language_entity_sources les
        WHERE les.external_id = c.grn_number::TEXT
          AND les.external_id_type IN (
            'grn_language_number',
            'grn_language_id',
            'grn_id',
            'grn',
            'rolv_code'
          )
          AND les.is_external = TRUE
          AND les.deleted_at IS NULL
      ) AND NOT EXISTS (
        SELECT 1
        FROM regions r
        WHERE (
            LOWER(TRIM(r.name)) = LOWER(TRIM(c.country_name))
            OR EXISTS (
              SELECT 1
              FROM region_aliases ra
              WHERE ra.region_id = r.id
                AND LOWER(TRIM(ra.alias_name)) = LOWER(TRIM(c.country_name))
                AND ra.deleted_at IS NULL
            )
          )
          AND r.level = 'country'
          AND r.deleted_at IS NULL
      ) THEN 'no_language_entity_and_region'
      WHEN NOT EXISTS (
        SELECT 1
        FROM language_entity_sources les
        WHERE les.external_id = c.grn_number::TEXT
          AND les.external_id_type IN (
            'grn_language_number',
            'grn_language_id',
            'grn_id',
            'grn',
            'rolv_code'
          )
          AND les.is_external = TRUE
          AND les.deleted_at IS NULL
      ) THEN 'no_language_entity'
      ELSE 'no_region'
    END AS skip_reason
  FROM
    grn_language_coordinates_cache c
  WHERE
    -- Only track entries that couldn't be matched (have required fields but no match)
    c.grn_number IS NOT NULL
    AND c.country_name IS NOT NULL
    AND c.location IS NOT NULL
    AND (
      -- No language entity match
      NOT EXISTS (
        SELECT 1
        FROM language_entity_sources les
        WHERE les.external_id = c.grn_number::TEXT
          AND les.external_id_type IN (
            'grn_language_number',
            'grn_language_id',
            'grn_id',
            'grn',
            'rolv_code'
          )
          AND les.is_external = TRUE
          AND les.deleted_at IS NULL
      )
      OR
      -- Has language entity but no region match
      (
        EXISTS (
          SELECT 1
          FROM language_entity_sources les
          WHERE les.external_id = c.grn_number::TEXT
            AND les.external_id_type IN (
              'grn_language_number',
              'grn_language_id',
              'grn_id',
              'grn',
              'rolv_code'
            )
            AND les.is_external = TRUE
            AND les.deleted_at IS NULL
        )
        AND NOT EXISTS (
          SELECT 1
          FROM regions r
          WHERE (
              LOWER(TRIM(r.name)) = LOWER(TRIM(c.country_name))
              OR EXISTS (
                SELECT 1
                FROM region_aliases ra
                WHERE ra.region_id = r.id
                  AND LOWER(TRIM(ra.alias_name)) = LOWER(TRIM(c.country_name))
                  AND ra.deleted_at IS NULL
              )
            )
            AND r.level = 'country'
            AND r.deleted_at IS NULL
        )
      )
    );

  -- Calculate statistics separately (can't reference CTEs after INSERT)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE EXISTS (
          SELECT 1
          FROM language_entity_sources les
          WHERE les.external_id = c.grn_number::TEXT
            AND les.external_id_type IN (
              'grn_language_number',
              'grn_language_id',
              'grn_id',
              'grn',
              'rolv_code'
            )
            AND les.is_external = TRUE
            AND les.deleted_at IS NULL
        )
        AND EXISTS (
          SELECT 1
          FROM regions r
          WHERE (
              LOWER(TRIM(r.name)) = LOWER(TRIM(c.country_name))
              OR EXISTS (
                SELECT 1
                FROM region_aliases ra
                WHERE ra.region_id = r.id
                  AND LOWER(TRIM(ra.alias_name)) = LOWER(TRIM(c.country_name))
                  AND ra.deleted_at IS NULL
              )
            )
            AND r.level = 'country'
            AND r.deleted_at IS NULL
        )
        AND c.location IS NOT NULL
    ),
    COUNT(*) FILTER (
      WHERE c.grn_number IS NOT NULL
        AND c.country_name IS NOT NULL
        AND c.location IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM language_entity_sources les
          WHERE les.external_id = c.grn_number::TEXT
            AND les.external_id_type IN (
              'grn_language_number',
              'grn_language_id',
              'grn_id',
              'grn',
              'rolv_code'
            )
            AND les.is_external = TRUE
            AND les.deleted_at IS NULL
        )
    ),
    COUNT(*) FILTER (
      WHERE c.grn_number IS NOT NULL
        AND c.country_name IS NOT NULL
        AND c.location IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM language_entity_sources les
          WHERE les.external_id = c.grn_number::TEXT
            AND les.external_id_type IN (
              'grn_language_number',
              'grn_language_id',
              'grn_id',
              'grn',
              'rolv_code'
            )
            AND les.is_external = TRUE
            AND les.deleted_at IS NULL
        )
        AND NOT EXISTS (
          SELECT 1
          FROM regions r
          WHERE (
              LOWER(TRIM(r.name)) = LOWER(TRIM(c.country_name))
              OR EXISTS (
                SELECT 1
                FROM region_aliases ra
                WHERE ra.region_id = r.id
                  AND LOWER(TRIM(ra.alias_name)) = LOWER(TRIM(c.country_name))
                  AND ra.deleted_at IS NULL
              )
            )
            AND r.level = 'country'
            AND r.deleted_at IS NULL
        )
    ),
    (
      SELECT COUNT(*)
      FROM language_entities_regions ler
      WHERE ler.location_source = 'GRN'
        AND ler.updated_at >= NOW() - INTERVAL '1 minute'
    ) INTO v_processed,
    v_matched,
    v_skipped_no_language_entity,
    v_skipped_no_region,
    v_upserted
  FROM
    grn_language_coordinates_cache c
  WHERE
    c.grn_number IS NOT NULL
    AND c.country_name IS NOT NULL
    AND c.location IS NOT NULL;

  -- Return results
  RETURN QUERY
  SELECT
    v_processed,
    v_matched,
    v_skipped_no_language_entity,
    v_skipped_no_region,
    v_upserted;
END;
$$;


comment ON function transform_grn_coordinates_cache_to_language_entities_regions () IS 'Transforms GRN coordinates cache into language_entities_regions. Matches GRN numbers to language_entity_ids and country names to region_ids. Only updates rows where location_source IS NULL or location_source = ''GRN'' to preserve manual entries. Optimized with DISTINCT ON for better performance on large datasets.';
