-- Add Missing Foreign Key Indexes
-- Migration: 20251226000101_add_foreign_key_indexes.sql
-- ============================================================================
-- This migration adds indexes on foreign key columns that don't have
-- covering indexes. This improves JOIN performance and foreign key
-- constraint checks.
--
-- Note: CONCURRENTLY removed as migrations run in transactions.
-- Total: 28 foreign keys across 22 tables
-- ============================================================================
-- TABLE: bible_translation_overrides
-- FK: created_by → users.id
CREATE INDEX if NOT EXISTS idx_bible_translation_overrides_created_by ON bible_translation_overrides (created_by);


-- TABLE: chapter_listens
-- FK: origin_share_id → shares.id
CREATE INDEX if NOT EXISTS idx_chapter_listens_origin_share_id ON chapter_listens (origin_share_id);


-- TABLE: donation_allocations
-- FK: created_by → users.id
CREATE INDEX if NOT EXISTS idx_donation_allocations_created_by ON donation_allocations (created_by);


-- TABLE: donations
-- FK: created_by → users.id
CREATE INDEX if NOT EXISTS idx_donations_created_by ON donations (created_by);


-- TABLE: donations
-- FK: intent_language_entity_id → language_entities.id
CREATE INDEX if NOT EXISTS idx_donations_intent_language_entity_id ON donations (intent_language_entity_id);


-- TABLE: donations
-- FK: intent_operation_id → operations.id
CREATE INDEX if NOT EXISTS idx_donations_intent_operation_id ON donations (intent_operation_id);


-- TABLE: donations
-- FK: intent_region_id → regions.id
CREATE INDEX if NOT EXISTS idx_donations_intent_region_id ON donations (intent_region_id);


-- TABLE: external_projects_overrides
-- FK: created_by → users.id
CREATE INDEX if NOT EXISTS idx_external_projects_overrides_created_by ON external_projects_overrides (created_by);


-- TABLE: language_funding
-- FK: created_by → users.id
CREATE INDEX if NOT EXISTS idx_language_funding_created_by ON language_funding (created_by);


-- TABLE: media_file_listens
-- FK: origin_share_id → shares.id
CREATE INDEX if NOT EXISTS idx_media_file_listens_origin_share_id ON media_file_listens (origin_share_id);


-- TABLE: media_files
-- FK: project_id → projects.id
CREATE INDEX if NOT EXISTS idx_media_files_project_id ON media_files (project_id);


-- TABLE: media_files
-- FK: sequence_id → sequences.id
CREATE INDEX if NOT EXISTS idx_media_files_sequence_id ON media_files (sequence_id);


-- TABLE: media_files_verses
-- FK: project_id → projects.id
CREATE INDEX if NOT EXISTS idx_media_files_verses_project_id ON media_files_verses (project_id);


-- TABLE: operation_costs
-- FK: created_by → users.id
CREATE INDEX if NOT EXISTS idx_operation_costs_created_by ON operation_costs (created_by);


-- TABLE: operations
-- FK: created_by → users.id
CREATE INDEX if NOT EXISTS idx_operations_created_by ON operations (created_by);


-- TABLE: partner_orgs_projects
-- FK: created_by → users.id
CREATE INDEX if NOT EXISTS idx_partner_orgs_projects_created_by ON partner_orgs_projects (created_by);


-- TABLE: people_groups_sources
-- FK: created_by → users.id
CREATE INDEX if NOT EXISTS idx_people_groups_sources_created_by ON people_groups_sources (created_by);


-- TABLE: project_updates
-- FK: created_by → users.id
CREATE INDEX if NOT EXISTS idx_project_updates_created_by ON project_updates (created_by);


-- TABLE: region_funding_overrides
-- FK: created_by → users.id
CREATE INDEX if NOT EXISTS idx_region_funding_overrides_created_by ON region_funding_overrides (created_by);


-- TABLE: segments
-- FK: project_id → projects.id
CREATE INDEX if NOT EXISTS idx_segments_project_id ON segments (project_id);


-- TABLE: sequences
-- FK: chapter_id → chapters.id
CREATE INDEX if NOT EXISTS idx_sequences_chapter_id ON sequences (chapter_id);


-- TABLE: sequences_segments
-- FK: project_id → projects.id
CREATE INDEX if NOT EXISTS idx_sequences_segments_project_id ON sequences_segments (project_id);


-- TABLE: subscriptions
-- FK: intent_language_entity_id → language_entities.id
CREATE INDEX if NOT EXISTS idx_subscriptions_intent_language_entity_id ON subscriptions (intent_language_entity_id);


-- TABLE: subscriptions
-- FK: intent_operation_id → operations.id
CREATE INDEX if NOT EXISTS idx_subscriptions_intent_operation_id ON subscriptions (intent_operation_id);


-- TABLE: subscriptions
-- FK: intent_region_id → regions.id
CREATE INDEX if NOT EXISTS idx_subscriptions_intent_region_id ON subscriptions (intent_region_id);


-- TABLE: user_current_selections
-- FK: selected_audio_version → audio_versions.id
CREATE INDEX if NOT EXISTS idx_user_current_selections_selected_audio_version ON user_current_selections (selected_audio_version);


-- TABLE: user_current_selections
-- FK: selected_text_version → text_versions.id
CREATE INDEX if NOT EXISTS idx_user_current_selections_selected_text_version ON user_current_selections (selected_text_version);


-- TABLE: verse_listens
-- FK: origin_share_id → shares.id
CREATE INDEX if NOT EXISTS idx_verse_listens_origin_share_id ON verse_listens (origin_share_id);
