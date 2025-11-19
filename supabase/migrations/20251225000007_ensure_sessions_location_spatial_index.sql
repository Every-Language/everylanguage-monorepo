-- Ensure spatial GIST index exists on sessions.location
-- This index is critical for efficient bbox queries in get_global_sessions_heatmap RPC
-- The index uses GIST (Generalized Search Tree) which is optimized for spatial queries
-- Check if index exists, create if missing
-- Note: This index may already exist from earlier migrations, but we ensure it exists here
CREATE INDEX if NOT EXISTS idx_sessions_location_gist ON public.sessions USING gist (location)
WHERE
  location IS NOT NULL;


comment ON index idx_sessions_location_gist IS 'Spatial GIST index on sessions.location for efficient bounding box queries. Used by get_global_sessions_heatmap RPC function for PostGIS spatial filtering.';
