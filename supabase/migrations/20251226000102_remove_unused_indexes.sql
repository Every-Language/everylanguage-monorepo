-- Remove Unused Indexes
-- Migration: 20251226000102_remove_unused_indexes.sql
-- ============================================================================
-- This migration removes indexes that have never been used (idx_scan = 0),
-- excluding primary keys and unique constraints.
--
-- Note: CONCURRENTLY removed as migrations run in transactions.
-- Total: 44 unused indexes (~25MB+ freed)
-- ============================================================================
-- TABLE: app_downloads
-- idx_app_downloads_device_id (40 kB)
DROP INDEX if EXISTS idx_app_downloads_device_id;


-- idx_app_downloads_location (32 kB)
DROP INDEX if EXISTS idx_app_downloads_location;


-- TABLE: chapter_listens
-- idx_chapter_listens_chapter_id (40 kB)
DROP INDEX if EXISTS idx_chapter_listens_chapter_id;


-- TABLE: grn_coordinates_unmatched
-- idx_grn_coords_unmatched_grn_number (40 kB)
DROP INDEX if EXISTS idx_grn_coords_unmatched_grn_number;


-- TABLE: grn_language_cache
-- idx_grn_cache_alternate_names_gin (9480 kB) - GIN index (verify not used for text search)
DROP INDEX if EXISTS idx_grn_cache_alternate_names_gin;


-- idx_grn_cache_programs_gin (6856 kB) - GIN index (verify not used for text search)
DROP INDEX if EXISTS idx_grn_cache_programs_gin;


-- idx_grn_cache_has_recordings (264 kB)
DROP INDEX if EXISTS idx_grn_cache_has_recordings;


-- idx_grn_cache_audio_sample (160 kB)
DROP INDEX if EXISTS idx_grn_cache_audio_sample;


-- TABLE: grn_language_coordinates_cache
-- idx_grn_coords_cache_location (816 kB) - Spatial index
DROP INDEX if EXISTS idx_grn_coords_cache_location;


-- idx_grn_coords_cache_iso_code (408 kB)
DROP INDEX if EXISTS idx_grn_coords_cache_iso_code;


-- TABLE: jp_language_cache
-- idx_jp_cache_least_reached (48 kB)
DROP INDEX if EXISTS idx_jp_cache_least_reached;


-- idx_jp_cache_country_code (192 kB)
DROP INDEX if EXISTS idx_jp_cache_country_code;


-- idx_jp_cache_jp_scale (144 kB)
DROP INDEX if EXISTS idx_jp_cache_jp_scale;


-- TABLE: jp_people_groups_cache
-- idx_jp_pg_cache_location (704 kB) - Spatial index
DROP INDEX if EXISTS idx_jp_pg_cache_location;


-- idx_jp_pg_cache_iso3 (192 kB)
DROP INDEX if EXISTS idx_jp_pg_cache_iso3;


-- idx_jp_pg_cache_rog3 (192 kB)
DROP INDEX if EXISTS idx_jp_pg_cache_rog3;


-- TABLE: language_coordinates
-- idx_language_coords_language_id (472 kB)
DROP INDEX if EXISTS idx_language_coords_language_id;


-- idx_language_coords_location_source (280 kB)
DROP INDEX if EXISTS idx_language_coords_location_source;


-- idx_language_coords_region_id (184 kB)
DROP INDEX if EXISTS idx_language_coords_region_id;


-- TABLE: language_stats
-- idx_language_stats_rolv_code (552 kB)
DROP INDEX if EXISTS idx_language_stats_rolv_code;


-- idx_language_stats_iso639_3 (368 kB)
DROP INDEX if EXISTS idx_language_stats_iso639_3;


-- idx_language_stats_bible_status (208 kB)
DROP INDEX if EXISTS idx_language_stats_bible_status;


-- idx_language_stats_has_audio_recordings (184 kB)
DROP INDEX if EXISTS idx_language_stats_has_audio_recordings;


-- idx_language_stats_has_new_testament (96 kB)
DROP INDEX if EXISTS idx_language_stats_has_new_testament;


-- idx_language_stats_has_whole_bible (32 kB)
DROP INDEX if EXISTS idx_language_stats_has_whole_bible;


-- TABLE: media_file_listens
-- idx_media_listens_duration (40 kB)
DROP INDEX if EXISTS idx_media_listens_duration;


-- TABLE: media_files
-- idx_media_files_start_verse_id (40 kB)
DROP INDEX if EXISTS idx_media_files_start_verse_id;


-- TABLE: operation_costs
-- idx_operation_costs_occurred (16 kB)
DROP INDEX if EXISTS idx_operation_costs_occurred;


-- TABLE: people_groups
-- idx_people_groups_name (640 kB)
DROP INDEX if EXISTS idx_people_groups_name;


-- idx_people_groups_parent_id (200 kB)
DROP INDEX if EXISTS idx_people_groups_parent_id;


-- TABLE: people_groups_coordinates
-- idx_people_groups_coords_location (1464 kB) - Spatial index
DROP INDEX if EXISTS idx_people_groups_coords_location;


-- idx_people_groups_coords_people_group_id (776 kB)
DROP INDEX if EXISTS idx_people_groups_coords_people_group_id;


-- idx_people_groups_coords_region_id (368 kB)
DROP INDEX if EXISTS idx_people_groups_coords_region_id;


-- TABLE: people_groups_regions
-- idx_people_groups_regions_location (1312 kB) - Spatial index
DROP INDEX if EXISTS idx_people_groups_regions_location;


-- TABLE: people_groups_stats
-- idx_people_groups_stats_people_id3 (472 kB)
DROP INDEX if EXISTS idx_people_groups_stats_people_id3;


-- idx_people_groups_stats_primary_language_rol3 (360 kB)
DROP INDEX if EXISTS idx_people_groups_stats_primary_language_rol3;


-- idx_people_groups_stats_least_reached (120 kB)
DROP INDEX if EXISTS idx_people_groups_stats_least_reached;


-- idx_people_groups_stats_frontier (104 kB)
DROP INDEX if EXISTS idx_people_groups_stats_frontier;


-- TABLE: region_stats
-- idx_region_stats_rog3 (32 kB)
DROP INDEX if EXISTS idx_region_stats_rog3;


-- idx_region_stats_iso3 (32 kB)
DROP INDEX if EXISTS idx_region_stats_iso3;


-- idx_region_stats_iso2 (32 kB)
DROP INDEX if EXISTS idx_region_stats_iso2;


-- TABLE: sessions
-- idx_sessions_app_download_id (128 kB)
DROP INDEX if EXISTS idx_sessions_app_download_id;


-- idx_sessions_platform (120 kB)
DROP INDEX if EXISTS idx_sessions_platform;


-- TABLE: user_playlists
-- idx_user_playlists_user_playlist_group_id (16 kB)
DROP INDEX if EXISTS idx_user_playlists_user_playlist_group_id;
