# Database Conventions

Common patterns and conventions used across the database schema.

## Naming Conventions

### Tables

- Plural nouns: `users`, `projects`, `donations`
- Snake_case: `user_roles`, `media_files`
- Junction tables: `{table1}_{table2}` (e.g., `projects_teams`, `bases_teams`)

### Columns

- `id` - UUID primary key (always `UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID()`)
- `created_at` - Timestamp of creation
- `updated_at` - Timestamp of last update
- `deleted_at` - Soft delete timestamp (NULL = active)
- `created_by` - User who created the record (for shared resources)
- `user_id` - User who owns the record (for personal data)

## User References

### `user_id` vs `created_by`

- **`user_id`**: Personal data owned by a user
  - Examples: `user_playlists`, `user_bookmarks`, `user_saved_audio_versions`
  - RLS: `user_id = auth.uid()`
  - User can read/write their own data

- **`created_by`**: Shared resources created by a user
  - Examples: `projects`, `sequences`, `media_files`
  - RLS: Uses `has_permission()` for access control
  - Ownership grants read/write, but permissions control access

## Soft Deletes

Many tables use soft deletes instead of hard deletes:

```sql
deleted_at TIMESTAMP WITH TIME ZONE
```

- `deleted_at IS NULL` = active record
- `deleted_at IS NOT NULL` = deleted record
- Queries should filter: `WHERE deleted_at IS NULL`

## Timestamps

Standard timestamp columns:

- `created_at` - Set on insert, never updated
- `updated_at` - Set on insert and update (via trigger)
- `deleted_at` - Set when soft deleting

Triggers automatically update `updated_at`:

```sql
CREATE TRIGGER update_{table}_updated_at
BEFORE UPDATE ON {table}
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

## Utility Triggers

### `update_{table}_updated_at`

**Trigger pattern** - Automatically updates `updated_at` timestamp.

- Fires on: `UPDATE` on table
- Pattern: Used across all tables with `updated_at` columns
- Function: `trigger_set_timestamp()` or table-specific functions

This pattern is applied to most tables in the database to maintain accurate `updated_at` timestamps.

## Geographic Data

Uses PostGIS for geographic data:

- `location` - Point geometry (`geometry(point, 4326)`)
- `boundary` - Polygon geometry for regions
- Spatial indexes: `CREATE INDEX ... USING gist (location)`

## Enums

PostgreSQL enums for constrained values:

```sql
CREATE TYPE {enum_name} AS ENUM('value1', 'value2', 'value3');
```

Common enums:

- `platform_type` - `ios`, `android`, `web`, `desktop`
- `donation_status` - `draft`, `pending`, `completed`, `cancelled`
- `publish_status` - `pending`, `published`, `archived`
- `resource_type` - `global`, `team`, `project`, `base`, `partner`

## Foreign Keys

Foreign keys follow patterns:

- `{table}_id` - References `{table}.id`
- `ON DELETE CASCADE` - Child records deleted when parent deleted
- `ON DELETE SET NULL` - Foreign key set to NULL when parent deleted
- `ON DELETE RESTRICT` - Prevents deletion if children exist

## Indexes

Common index patterns:

- Primary key: Automatic index on `id`
- Foreign keys: Automatic indexes on FK columns
- Unique constraints: Automatic indexes
- Performance indexes: Created for common query patterns
- Partial indexes: `WHERE deleted_at IS NULL` for active records
- Spatial indexes: `USING gist` for PostGIS columns

## RLS Patterns

See [RLS Policies](../auth/rls-policies.md) for detailed patterns.

Common patterns:

- Public read: `USING (TRUE)` for SELECT
- Permission-based write: `has_permission(auth.uid(), 'resource.write', 'resource', id)`
- User-owned: `USING (user_id = auth.uid())`

## Materialized Views

Used for expensive aggregations:

- Refreshed periodically: `REFRESH MATERIALIZED VIEW CONCURRENTLY`
- Queue-based refresh: `progress_refresh_queue` for progress calculations
- Functions: `refresh_progress_materialized_views_concurrently()`

## Currency & Amounts

Financial amounts stored as integers (cents):

- `amount_cents INTEGER` - Amount in smallest currency unit
- Avoids floating-point precision issues
- Convert to dollars: `amount_cents / 100.0`
- Currency codes: ISO 4217 (3-letter codes like `USD`, `EUR`)

## Polymorphic References

Some tables use polymorphic references:

- `target_type` - Enum indicating what `target_id` references
- `target_id` - UUID referencing different tables based on `target_type`
- Examples: `images`, `sequences_targets`, `segments_targets`

## Junction Tables

Junction tables often include:

- Ordering: `segment_index`, `display_order`
- Metadata: `is_deleted`, `is_numbered`, `segment_color`
- Timestamps: `created_at`, `updated_at`
- Soft history: `assigned_at`, `unassigned_at`
