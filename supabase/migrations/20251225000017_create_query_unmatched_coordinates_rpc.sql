-- 20251225000017_create_query_unmatched_coordinates_rpc.sql
-- Helper functions to query and analyze unmatched GRN coordinates entries
-- Get summary of unmatched entries by reason
CREATE OR REPLACE FUNCTION get_grn_coordinates_unmatched_summary () returns TABLE (
  skip_reason TEXT,
  count BIGINT,
  unique_grn_numbers BIGINT,
  unique_countries BIGINT
) language sql stable security invoker
SET
  search_path = public AS $$
  SELECT
    skip_reason,
    COUNT(*) AS count,
    COUNT(DISTINCT grn_number) FILTER (WHERE grn_number IS NOT NULL) AS unique_grn_numbers,
    COUNT(DISTINCT country_name) FILTER (WHERE country_name IS NOT NULL) AS unique_countries
  FROM
    grn_coordinates_unmatched
  WHERE
    resolved_at IS NULL
  GROUP BY
    skip_reason
  ORDER BY
    count DESC;
$$;


-- Get all unresolved unmatched entries (for manual review)
CREATE OR REPLACE FUNCTION get_grn_coordinates_unmatched_unresolved (
  p_limit INTEGER DEFAULT 1000,
  p_skip_reason TEXT DEFAULT NULL
) returns TABLE (
  id UUID,
  cache_id UUID,
  grn_number INTEGER,
  language_name TEXT,
  iso_code TEXT,
  country_name TEXT,
  skip_reason TEXT,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ
) language sql stable security invoker
SET
  search_path = public AS $$
  SELECT
    u.id,
    u.cache_id,
    u.grn_number,
    u.language_name,
    u.iso_code,
    u.country_name,
    u.skip_reason,
    u.first_seen_at,
    u.last_seen_at
  FROM
    grn_coordinates_unmatched u
  WHERE
    u.resolved_at IS NULL
    AND (p_skip_reason IS NULL OR u.skip_reason = p_skip_reason)
  ORDER BY
    u.last_seen_at DESC
  LIMIT p_limit;
$$;


-- Mark unmatched entries as resolved
CREATE OR REPLACE FUNCTION resolve_grn_coordinates_unmatched (
  p_ids UUID[],
  p_resolution_notes TEXT DEFAULT NULL,
  p_resolved_by UUID DEFAULT NULL
) returns INTEGER language plpgsql security definer
SET
  search_path = public AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE grn_coordinates_unmatched
  SET
    resolved_at = NOW(),
    resolved_by = p_resolved_by,
    resolution_notes = p_resolution_notes
  WHERE
    id = ANY(p_ids)
    AND resolved_at IS NULL;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;


comment ON function get_grn_coordinates_unmatched_summary () IS 'Returns summary statistics of unmatched entries grouped by skip reason';


comment ON function get_grn_coordinates_unmatched_unresolved (INTEGER, TEXT) IS 'Returns unresolved unmatched entries for manual review, optionally filtered by skip reason';


comment ON function resolve_grn_coordinates_unmatched (UUID[], TEXT, UUID) IS 'Marks unmatched entries as resolved with optional notes and user ID';
