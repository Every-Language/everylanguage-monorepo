-- Quick test for transform_grn_coordinates_cache_to_language_entities_regions RPC
-- This transforms cached GRN coordinates into language_entities_regions table

\echo 'Running transform_grn_coordinates_cache_to_language_entities_regions...'
SELECT * FROM transform_grn_coordinates_cache_to_language_entities_regions();

\echo ''
\echo 'Checking skipped entries summary...'
SELECT * FROM get_grn_coordinates_skipped_summary();

\echo ''
\echo 'Sample of unresolved skipped entries (first 10)...'
SELECT 
  skip_reason,
  grn_number,
  country_name,
  language_name,
  first_seen_at,
  seen_count
FROM get_grn_coordinates_skipped_unresolved(10);

