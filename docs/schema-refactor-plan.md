## Schema Split and API Surfacing Plan (for Monorepo Migration)

This document is a hand-off plan for another agent to execute a safe, stepwise separation of Postgres schemas and adoption of an `api`-only surface for clients. It assumes Supabase Postgres with PostgREST, Supabase Edge Functions, and PowerSync.

### Goals

- Introduce clear schema boundaries aligned to security and data lifecycle.
- Expose only the `api` schema to client apps; keep base tables hidden.
- Preserve current frontend behavior (no breaking changes) by surfacing identical resource names via `api` views.
- Keep PowerSync syncing base tables (not views) with updated schema-qualified rules.

### Constraints and Principles

- Supabase migrations: use `supabase migrations new` for all changes; do not hand-edit migration files.
- Never modify production DB directly; deploy via CI/CD only. Test locally first.
- `created_by` columns reference `public.users` (not `auth.users`).
- RLS stays on base tables; `api` views use `security_invoker = true`.
- RBAC: prefer `public.has_permission(user_id, action_key, resource_type, resource_id)` in shared-resource policies; tables with `user_id` use simple `user_id = auth.uid()` policies.
- Bible structure tables (`bible_versions`, `books`, `chapters`, `verses`) use TEXT ids, not UUIDs. Ensure all moves preserve existing types, constraints, and triggers.
- PowerSync does not sync views or materialized views; it syncs base tables only.

### Target Schema Layout

- `app`: users/RBAC/organizations/teams context and helper functions
- `ref`: reference data for languages and regions
- `bible`: Bible structural content (text id types preserved)
- `content`: shared content (translations, audio, media, images, passages, tags, verse feedback)
- `user_content` (recommended) OR keep in `content`: per-user tables (bookmarks, saved versions, playlists, selections)
- `recording`: projects/sequences/segments models
- `analytics`: event tables, reporting views/materialized views
- `finance`: adoptions, sponsorships, budgets, contributions, FX, wallets, financial MVs
- `ops`: operational queues/utilities
- `api`: read/write views and RPCs that form the public API surface

### Table Inventory and Brief Purpose

This inventory summarizes each table’s purpose (grouped by the recommended target schema). It reflects the current schema dump and prior migrations.

- app
  - `users`: application user profiles linked to Supabase `auth.users` (name, email, phone, etc.).
  - `roles`: catalog of roles, optionally scoped to a resource type.
  - `role_permissions`: permissions granted to roles per `resource_type` and `permission_key`.
  - `user_roles`: assignment of roles to users within a context (team/base/project/partner/global).
  - `teams`: organizational teams.
  - `bases`: physical bases/locations (with PostGIS point).
  - `bases_teams`: team membership and role at bases (with assignment window fields).
  - `projects_teams`: team assignment to projects with optional `project_role_id`.
  - `partner_orgs`: external partner organizations.
  - `partner_orgs_projects`: partner–project associations (assignment windows).

- ref
  - `language_entities`: hierarchical languages (family/language/dialect/mother_tongue).
  - `language_entities_regions`: links languages to regions plus dominance level.
  - `language_aliases`: alternate names for languages.
  - `language_entity_sources`: provenance for language records (internal/external sources).
  - `language_properties`: key/value attributes on languages.
  - `language_entity_versions`: versioned snapshots for language changes.
  - `regions`: hierarchical geographic regions (with PostGIS multipolygon boundary).
  - `region_aliases`: alternate names for regions.
  - `region_sources`: provenance for regions (internal/external IDs).
  - `region_properties`: key/value attributes on regions (e.g., ISO codes).
  - `region_versions`: versioned snapshots for region changes.

- bible (TEXT ids retained as per project rules)
  - `bible_versions`: structural variants (e.g., Catholic/Protestant canon).
  - `books`: books within a `bible_version` with ordinal and global order.
  - `chapters`: chapters within books with global order.
  - `verses`: verses within chapters with global order.

- content (shared)
  - `text_versions`: textual translations per language and bible_version (source/provenance fields).
  - `verse_texts`: verse content per `text_version`.
  - `audio_versions`: audio translation/version per language and bible_version (optional project linkage).
  - `media_files`: audio/video assets with lifecycle fields and metadata.
  - `media_files_targets`: links media to target entities (chapter/book/passage/etc.).
  - `media_files_verses`: per-verse timing/mapping within media.
  - `tags`: key–value tags catalog for flexible metadata.
  - `media_files_tags`: many-to-many between media and tags.
  - `image_sets`: logical groups of images.
  - `images`: images associated to a target entity or set.
  - `passages`: user-defined passage ranges (start/end verse).
  - `verse_feedback`: moderation/feedback on verses/media (approved/changes required).

- user_content (per-user)
  - `user_saved_audio_versions`: audio versions saved by a user.
  - `user_saved_text_versions`: text versions saved by a user.
  - `user_version_selections`: a user’s current selected audio/text versions.
  - `user_bookmark_folders`: personal bookmark folders (hierarchical).
  - `user_bookmarks`: saved items; supports passages or custom types.
  - `user_positions`: last positions for resumable content.
  - `user_custom_texts`: user-authored text content (used in playlists).
  - `user_playlist_groups`: user’s logical groups for playlists.
  - `user_playlists`: user–playlist relationship with user-level metadata.
  - `playlists_playlist_groups`: playlists organized into user groups with order.
  - `user_saved_image_sets`: saved `image_sets` per user.

- recording
  - `projects`: recording projects with source/target languages and optional region/location.
  - `sequences`: project sequences referencing bible content, with range constraints.
  - `segments`: individual recorded source/target segments.
  - `sequences_segments`: ordering and membership of segments in a sequence.
  - `sequences_tags`: tag assignments for sequences.
  - `sequences_targets`: sequence-to-target links (chapter/book/passage/etc.).
  - `segments_targets`: segment-to-target links (chapter/book/passage/etc.).

- analytics
  - `sessions`: app sessions (device/platform, optional geo point/country code).
  - `app_downloads`: installs and attributions (origin share, platform, optional geo).
  - `media_file_listens`: listening events for media (position/duration, optional geo).
  - `verse_listens`: verse-level listens.
  - `chapter_listens`: chapter-level listens.
  - `shares`: share events/links (with chain via origin_share_id).
  - `share_opens`: open events for shares.
  - Views/MVs (defined under analytics then surfaced via `api`):
    - `vw_iso_country_to_region`, `vw_language_listens_stats`, `vw_country_language_listens_heatmap`, `mv_language_listens_stats`, plus progress MVs `mv_audio_*`, `mv_text_*`.

- finance
  - `language_adoptions`: public listing of languages available for sponsorship with budgets/status.
  - `sponsorships`: partner commitments; can reference adoption or project.
  - `sponsorship_allocations`: percentage allocations of a sponsorship to one or more projects over time.
  - `project_budgets`: versioned project budgets and currency.
  - `project_budget_items`: line items within a budget.
  - `project_budget_actual_costs`: actual spend records (with optional FX reporting fields).
  - `contributions`: incoming funds from sponsors/donors (Stripe fields included).
  - `exchange_rates`: provider FX rates (as-of date, JSON map).
  - `stripe_events`: auditable webhook events.
  - `partner_wallets`: optional partner wallets for non-Stripe flows.
  - `partner_wallet_transactions`: wallet transactions (deposit/withdrawal/adjustment).
  - Materialized view: `project_financials` (per-project budget/funding/actuals summary).

- ops
  - `progress_refresh_queue`: queue of version IDs requiring materialized view refresh.

Notes:

- The historical `users_anon` table is not present in the current dump (analytics writes are authenticated-only; PowerSync writes directly to analytics tables as configured).
- Any additional auxiliary tables found during execution should be added to this inventory before proceeding.

### Table Mapping (authoritative guide)

- app
  - `users`, `roles`, `role_permissions`, `user_roles`, `teams`, `bases`, `bases_teams`, `projects_teams`, `partner_orgs`, `partner_orgs_projects`, function `has_permission(...)`
- ref
  - `language_entities`, `language_entities_regions`, `language_aliases`, `language_entity_sources`, `language_properties`, `language_entity_versions`
  - `regions`, `region_aliases`, `region_sources`, `region_properties`, `region_versions`
- bible (TEXT ids preserved)
  - `bible_versions`, `books`, `chapters`, `verses`, order functions/triggers (`get_*_global_order`, `update_*_global_order`)
- content (shared)
  - `text_versions`, `verse_texts`, `audio_versions`
  - `media_files`, `media_files_targets`, `media_files_verses`, `tags`, `media_files_tags`
  - `image_sets`, `images`, `passages`, `verse_feedback`
- user_content (per-user; move if splitting)
  - `user_saved_audio_versions`, `user_saved_text_versions`, `user_version_selections`
  - `user_bookmark_folders`, `user_bookmarks`, `user_positions`, `user_custom_texts`
  - `user_playlist_groups`, `user_playlists`, `playlists_playlist_groups`, `user_saved_image_sets`
- recording
  - `projects`, `sequences`, `segments`, `sequences_segments`, `sequences_tags`, `sequences_targets`, `segments_targets`
- analytics
  - event tables: `sessions`, `app_downloads`, `media_file_listens`, `verse_listens`, `chapter_listens`, `shares`, `share_opens`
  - reporting: `vw_iso_country_to_region`, `vw_language_listens_stats`, `vw_country_language_listens_heatmap`, `mv_language_listens_stats`
  - progress MVs: `mv_audio_*`, `mv_text_*`
- finance
  - `language_adoptions`, `sponsorships`, `sponsorship_allocations`
  - `project_budgets`, `project_budget_items`, `project_budget_actual_costs`
  - `contributions`, `exchange_rates`, `stripe_events`
  - `partner_wallets`, `partner_wallet_transactions`
  - MV: `project_financials`
- ops
  - `progress_refresh_queue`
- api (views + RPCs only)
  - `public_language_adoptions` (view)
  - `project_financials` (view over finance MV)
  - `vw_language_listens_stats`, `vw_country_language_listens_heatmap` (views)
  - `profile` (or `users`) updatable view for “My Profile”
  - Additional read surfaces as needed

### High-Level Execution Plan

0. Pre-checks

- Create a feature branch. Ensure local Supabase is up (`supabase start`).
- Confirm seeds run (`supabase db reset` for local only). Backup dev data if needed.
- Regenerate and publish types after structural changes.

1. Create target schemas (no moves yet)

- New migration: `supabase migrations new init_schemas`

```sql
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS bible;
CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS user_content; -- if splitting per-user data
CREATE SCHEMA IF NOT EXISTS recording;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS ops;
CREATE SCHEMA IF NOT EXISTS api;
```

2. Stand up initial `api` views for current clients (no table moves yet)

- New migration: `supabase migrations new api_views_bootstrap`
- Create views that match existing client-consumed resources. Keep names identical where feasible.

```sql
-- Finance surfaces
CREATE VIEW api.project_financials WITH (security_invoker = true) AS
SELECT * FROM finance.project_financials;

-- Public adoptions listing
CREATE VIEW api.public_language_adoptions WITH (security_invoker = true) AS
SELECT * FROM finance.public_language_adoptions;

-- Analytics read surfaces
CREATE VIEW api.vw_language_listens_stats WITH (security_invoker = true) AS
SELECT * FROM analytics.vw_language_listens_stats;

CREATE VIEW api.vw_country_language_listens_heatmap WITH (security_invoker = true) AS
SELECT * FROM analytics.vw_country_language_listens_heatmap;

-- My Profile (updatable single-table view)
CREATE VIEW api.profile WITH (security_invoker = true) AS
SELECT id, first_name, last_name, email, phone_number, created_at, updated_at
FROM public.users;

GRANT USAGE ON SCHEMA api TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA api TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA api GRANT SELECT ON TABLES TO anon, authenticated;
GRANT UPDATE ON api.profile TO authenticated;
```

3. PostgREST exposure (transition state)

- Update `supabase/config.toml` `[api].schemas` to include `api` alongside `public` (keep both during transition):

```toml
[api]
schemas = ["api", "public", "graphql_public"]
extra_search_path = ["public", "extensions"]
```

4. Move base tables by domain in batches (no client breakage)

- For each batch below, create a dedicated migration (order matters due to FKs and function references). After each batch, run local reset/test.

Batch A: `ref`

```sql
ALTER TABLE public.language_entities SET SCHEMA ref;
ALTER TABLE public.language_entities_regions SET SCHEMA ref;
ALTER TABLE public.language_aliases SET SCHEMA ref;
ALTER TABLE public.language_entity_sources SET SCHEMA ref;
ALTER TABLE public.language_properties SET SCHEMA ref;
ALTER TABLE public.language_entity_versions SET SCHEMA ref;

ALTER TABLE public.regions SET SCHEMA ref;
ALTER TABLE public.region_aliases SET SCHEMA ref;
ALTER TABLE public.region_sources SET SCHEMA ref;
ALTER TABLE public.region_properties SET SCHEMA ref;
ALTER TABLE public.region_versions SET SCHEMA ref;
```

Batch B: `bible` (preserve TEXT ids and triggers)

```sql
ALTER TABLE public.bible_versions SET SCHEMA bible;
ALTER TABLE public.books SET SCHEMA bible;
ALTER TABLE public.chapters SET SCHEMA bible;
ALTER TABLE public.verses SET SCHEMA bible;
-- Ensure functions/triggers are schema-qualified; recreate if necessary
```

Batch C: `content` (shared)

```sql
ALTER TABLE public.text_versions SET SCHEMA content;
ALTER TABLE public.verse_texts SET SCHEMA content;
ALTER TABLE public.audio_versions SET SCHEMA content;
ALTER TABLE public.media_files SET SCHEMA content;
ALTER TABLE public.media_files_targets SET SCHEMA content;
ALTER TABLE public.media_files_verses SET SCHEMA content;
ALTER TABLE public.tags SET SCHEMA content;
ALTER TABLE public.media_files_tags SET SCHEMA content;
ALTER TABLE public.image_sets SET SCHEMA content;
ALTER TABLE public.images SET SCHEMA content;
ALTER TABLE public.passages SET SCHEMA content;
ALTER TABLE public.verse_feedback SET SCHEMA content;
```

Batch D: `user_content` (if splitting; else skip)

```sql
ALTER TABLE public.user_saved_audio_versions SET SCHEMA user_content;
ALTER TABLE public.user_saved_text_versions SET SCHEMA user_content;
ALTER TABLE public.user_version_selections SET SCHEMA user_content;
ALTER TABLE public.user_bookmark_folders SET SCHEMA user_content;
ALTER TABLE public.user_bookmarks SET SCHEMA user_content;
ALTER TABLE public.user_positions SET SCHEMA user_content;
ALTER TABLE public.user_custom_texts SET SCHEMA user_content;
ALTER TABLE public.user_playlist_groups SET SCHEMA user_content;
ALTER TABLE public.user_playlists SET SCHEMA user_content;
ALTER TABLE public.playlists_playlist_groups SET SCHEMA user_content;
ALTER TABLE public.user_saved_image_sets SET SCHEMA user_content;
```

Batch E: `recording`

```sql
ALTER TABLE public.projects SET SCHEMA recording;
ALTER TABLE public.sequences SET SCHEMA recording;
ALTER TABLE public.segments SET SCHEMA recording;
ALTER TABLE public.sequences_segments SET SCHEMA recording;
ALTER TABLE public.sequences_tags SET SCHEMA recording;
ALTER TABLE public.sequences_targets SET SCHEMA recording;
ALTER TABLE public.segments_targets SET SCHEMA recording;
```

Batch F: `analytics`

```sql
ALTER TABLE public.sessions SET SCHEMA analytics;
ALTER TABLE public.app_downloads SET SCHEMA analytics;
ALTER TABLE public.media_file_listens SET SCHEMA analytics;
ALTER TABLE public.verse_listens SET SCHEMA analytics;
ALTER TABLE public.chapter_listens SET SCHEMA analytics;
ALTER TABLE public.shares SET SCHEMA analytics;
ALTER TABLE public.share_opens SET SCHEMA analytics;
-- Views/MVs: DROP/CREATE under analytics; then re-point api views
```

Batch G: `finance`

```sql
ALTER TABLE public.language_adoptions SET SCHEMA finance;
ALTER TABLE public.sponsorships SET SCHEMA finance;
ALTER TABLE public.sponsorship_allocations SET SCHEMA finance;
ALTER TABLE public.project_budgets SET SCHEMA finance;
ALTER TABLE public.project_budget_items SET SCHEMA finance;
ALTER TABLE public.project_budget_actual_costs SET SCHEMA finance;
ALTER TABLE public.contributions SET SCHEMA finance;
ALTER TABLE public.exchange_rates SET SCHEMA finance;
ALTER TABLE public.stripe_events SET SCHEMA finance;
ALTER TABLE public.partner_wallets SET SCHEMA finance;
ALTER TABLE public.partner_wallet_transactions SET SCHEMA finance;
-- Materialized views recreated as finance.project_financials
```

Batch H: `ops`

```sql
ALTER TABLE public.progress_refresh_queue SET SCHEMA ops;
```

5. Update dependent functions, triggers, policies, and views

- Fully-qualify all references (e.g., `recording.projects`, `content.media_files`).
- Recreate dependent views/materialized views to point to new table locations.
- Confirm RLS policies still reference correct schema-qualified tables.

6. PowerSync sync rules update (critical)

- PowerSync must sync base tables, not views. Update rules to reference the new schema-qualified tables.
- Example (pseudo):

```sql
-- Before: SELECT * FROM projects WHERE ...
-- After:
SELECT * FROM recording.projects WHERE ...;
```

7. PostgREST final exposure

- When clients are confirmed to use only `api` resources, update `supabase/config.toml`:

```toml
[api]
schemas = ["api", "graphql_public"]
extra_search_path = ["public", "extensions"]
```

8. Optional: write surfaces

- For non-trivial write flows (multi-table/external systems), prefer Edge Functions.
- For simple single-table user edits (e.g., “My Profile”), use updatable `api` views or small SQL RPCs.

### Testing Checklist (per batch)

- `supabase db reset` locally; load seeds and run test SQL and unit tests.
- Verify PostgREST lists expected `api` relations only; base schemas are not exposed.
- RLS tests: verify unauthorized access is denied; authorized access works.
- Analytics: refresh functions run; MVs populate; `api` analytics views return expected data.
- Finance: `api.project_financials` readable; `api.public_language_adoptions` returns expected rows.
- PowerSync: device writes propagate; no errors in sync logs after schema-qualifying.

### Rollback Plan

- If a batch causes issues:
  - Revert the migration in dev; restore prior views.
  - Keep PostgREST exposing both `api` and `public` until fixed.
  - In worst case, revert PostgREST to expose `public` temporarily.

### Security and Grants

```sql
-- Restrict usage of base schemas from anon/authenticated
REVOKE USAGE ON SCHEMA app, ref, bible, content, user_content, recording, analytics, finance, ops FROM anon, authenticated;

-- Allow clients on api only
GRANT USAGE ON SCHEMA api TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA api TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA api GRANT SELECT ON TABLES TO anon, authenticated;

-- Updatable view example for profile
GRANT UPDATE ON api.profile TO authenticated;
```

### Example RPC for Controlled Writes (optional)

```sql
CREATE OR REPLACE FUNCTION api.update_my_profile(p_first text, p_last text, p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE public.users
  SET first_name = p_first, last_name = p_last, phone_number = p_phone, updated_at = now()
  WHERE auth_uid = auth.uid();
END$$;

GRANT EXECUTE ON FUNCTION api.update_my_profile(text, text, text) TO authenticated;
```

### Notes for the Executor Agent

- Use one migration per batch to simplify rollbacks and reviews.
- Always fully-qualify schema names in all SQL definitions going forward.
- After each migration, regenerate TypeScript types and publish if your workflows depend on them.
- Do not attempt to make PowerSync sync views or MVs; if a special shape is needed, create real `sync_*` tables and backfill/maintain via triggers/jobs.
- Preserve bible TEXT id semantics; do not coerce to UUID in any move.

### Acceptance Criteria

- Clients read exclusively from `api` schema with identical resource names (no UI changes required).
- PowerSync continues bi/uni-directional sync to base tables (schema-qualified) without errors.
- RLS remains enforced; no base schema is exposed to clients.
- Finance and analytics views under `api` return expected results.
  cl
