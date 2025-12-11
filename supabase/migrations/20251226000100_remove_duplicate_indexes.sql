-- Remove Duplicate Indexes
-- Migration: 20251226000100_remove_duplicate_indexes.sql
-- ============================================================================
-- This migration removes duplicate indexes, keeping the most appropriate
-- one based on naming conventions, specificity, and constraints.
-- Note: CONCURRENTLY removed as migrations run in transactions.
--
-- Strategy:
-- - Keep unique constraints (important for data integrity)
-- - Keep indexes with better names (more descriptive)
-- - Keep indexes with more specific filtering (e.g., _not_deleted variants)
-- - Remove GIN trgm indexes if not used for fuzzy text search
-- ============================================================================
-- TABLE: audio_versions
-- Columns: language_entity_id
-- Keeping: idx_audio_versions_language_entity_id_not_deleted (most specific)
DROP INDEX if EXISTS audio_versions_language_entity_id_idx;


DROP INDEX if EXISTS idx_audio_versions_language_entity_id;


-- TABLE: text_versions
-- Columns: language_entity_id
-- Keeping: idx_text_versions_language_entity_id_not_deleted (most specific)
DROP INDEX if EXISTS idx_text_versions_language_id;


DROP INDEX if EXISTS text_versions_language_entity_id_idx;


-- TABLE: books
-- Columns: bible_version_id
-- Keeping: idx_books_bible_version_id (more descriptive name)
DROP INDEX if EXISTS idx_books_bible_version;


-- TABLE: chapters
-- Columns: book_id
-- Keeping: idx_chapters_book_id (more descriptive name)
DROP INDEX if EXISTS idx_chapters_book;


-- TABLE: projects
-- Columns: created_by
-- Keeping: idx_projects_created_by (better naming convention)
DROP INDEX if EXISTS projects_created_by_idx;


-- TABLE: regions
-- Columns: parent_id
-- Keeping: idx_regions_parent_id (better naming convention)
DROP INDEX if EXISTS regions_parent_id_idx;


-- TABLE: regions
-- Columns: name
-- Keeping: idx_regions_name (btree index)
-- Removing: regions_name_trgm_idx (GIN trgm - only if not used for fuzzy search)
DROP INDEX if EXISTS regions_name_trgm_idx;


-- TABLE: language_aliases
-- Columns: alias_name
-- Keeping: idx_language_aliases_name (btree index)
-- Removing: language_aliases_alias_name_trgm_idx (GIN trgm - only if not used for fuzzy search)
DROP INDEX if EXISTS language_aliases_alias_name_trgm_idx;


-- TABLE: language_entities
-- Columns: name
-- Keeping: idx_language_entities_name (btree index)
-- Removing: language_entities_name_trgm_idx (GIN trgm - only if not used for fuzzy search)
DROP INDEX if EXISTS language_entities_name_trgm_idx;


-- TABLE: language_entities
-- Columns: parent_id
-- Keeping: idx_language_entities_parent_id (better naming convention)
DROP INDEX if EXISTS language_entities_parent_id_idx;


-- TABLE: region_aliases
-- Columns: alias_name
-- Keeping: idx_region_aliases_name (btree index)
-- Removing: region_aliases_alias_name_trgm_idx (GIN trgm - only if not used for fuzzy search)
DROP INDEX if EXISTS region_aliases_alias_name_trgm_idx;


-- TABLE: verses
-- Columns: chapter_id
-- Keeping: idx_verses_chapter_id (more descriptive name)
DROP INDEX if EXISTS idx_verses_chapter;


-- TABLE: verse_texts
-- Columns: text_version_id
-- Keeping: idx_verse_texts_text_version_id (more descriptive name)
DROP INDEX if EXISTS idx_verse_texts_text_version;


-- TABLE: media_files
-- Columns: audio_version_id
-- Keeping: idx_media_files_audio_version_id (more specific)
DROP INDEX if EXISTS idx_media_files_audio_published;


-- TABLE: media_files_verses
-- Columns: verse_id
-- Keeping: idx_media_files_verses_verse_id (more specific)
DROP INDEX if EXISTS idx_media_files_verses_verse_not_deleted;


-- TABLE: sessions
-- Columns: location
-- Keeping: idx_sessions_location_gist (GIST better for spatial queries)
DROP INDEX if EXISTS idx_sessions_location;


-- TABLE: subscriptions
-- Columns: stripe_subscription_id
-- Keeping: subscriptions_stripe_subscription_id_key (unique constraint - must keep)
DROP INDEX if EXISTS idx_subscriptions_stripe_subscription_id;


-- TABLE: people_groups_regions
-- Columns: people_group_id
-- Keeping: idx_people_groups_regions_group_id (more descriptive name)
DROP INDEX if EXISTS idx_people_groups_regions_people_group_id;


-- TABLE: user_roles
-- Columns: user_id
-- Keeping: idx_user_roles_user_id (more specific name)
DROP INDEX if EXISTS idx_user_roles_is_global;
