# Production Setup Guide: Joshua Project People Groups Sync

## Overview

This guide explains how to set up the Joshua Project people groups sync on your production Supabase project.

## Step 3: Initial Full Sync (Manual)

**Yes, you need to run the sync script manually the first time** to populate all data. The weekly cron will then keep it updated incrementally.

### Option A: Use the Sync Script (Recommended)

1. Update the script with your production credentials:

```bash
# Edit supabase/scripts/sync-all-jp-people-groups.sh
# Update these variables:
SUPABASE_URL="https://<your-production-project-ref>.supabase.co"
API_KEY="<your-production-anon-key>"
```

2. Run the script:

```bash
bash supabase/scripts/sync-all-jp-people-groups.sh
```

This will:

- Sync in batches of 10 pages (2,500 records) per batch
- Automatically reduce batch size if timeouts occur
- Continue until all data is synced
- Show progress as it runs

### Option B: Manual Incremental Sync

If you prefer manual control, you can call the function directly:

```bash
# Sync pages 1-50 (first batch)
curl -L -X POST 'https://<your-production-project-ref>.supabase.co/functions/v1/sync-jp-people-groups' \
  -H 'Authorization: Bearer <your-production-anon-key>' \
  -H 'apikey: <your-production-anon-key>' \
  -H 'Content-Type: application/json' \
  --data '{"maxPages": 50}'

# Then sync pages 51-100 (second batch)
curl -L -X POST 'https://<your-production-project-ref>.supabase.co/functions/v1/sync-jp-people-groups' \
  -H 'Authorization: Bearer <your-production-anon-key>' \
  -H 'apikey: <your-production-anon-key>' \
  -H 'Content-Type: application/json' \
  --data '{"maxPages": 50, "startPage": 51}'

# Continue until all pages are synced...
```

## Step 4: Run Transform Function

After syncing cache data, run the transform function to populate canonical tables:

```sql
-- In Supabase SQL Editor or via CLI
SELECT * FROM transform_jp_people_groups_cache();
```

This will:

- Create/update `people_groups` (concept-level)
- Create/update `people_groups_regions` (instance-level)
- Link languages to people group regions
- Auto-create missing languages if needed

## Step 5: Verify Cron Jobs

Check that cron jobs are scheduled correctly:

```sql
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname LIKE '%people_groups%';
```

You should see:

- `sync_jp_people_groups_cache_weekly` - Runs Sunday 3am, syncs 50 pages (~12,500 records)
- `sync-jp-people-groups-canonical-weekly` - Runs Sunday 4am, transforms cache to canonical tables

## Step 6: Ongoing Maintenance

### Weekly Automatic Sync

The cron jobs will automatically:

1. **Sunday 3am**: Sync 50 pages from Joshua Project API to cache
2. **Sunday 4am**: Transform cache data to canonical tables

### Manual Full Sync (if needed)

If you need to do a full sync (e.g., after a long gap), run the sync script again:

```bash
bash supabase/scripts/sync-all-jp-people-groups.sh
```

Then run the transform function:

```sql
SELECT * FROM transform_jp_people_groups_cache();
```

## Monitoring

### Check Cache Status

```sql
SELECT
  COUNT(*) as total_cache_entries,
  COUNT(DISTINCT people_id3) as unique_people_groups,
  MIN(last_synced_at) as oldest_sync,
  MAX(last_synced_at) as newest_sync
FROM jp_people_groups_cache;
```

### Check Canonical Data

```sql
SELECT
  COUNT(*) as people_groups,
  COUNT(DISTINCT pgr.id) as regions,
  COUNT(DISTINCT lepgr.language_entity_id) as languages_linked
FROM people_groups pg
LEFT JOIN people_groups_regions pgr ON pgr.people_group_id = pg.id
LEFT JOIN language_entities_people_groups_regions lepgr ON lepgr.people_group_region_id = pgr.id
WHERE pg.deleted_at IS NULL;
```

### Check Transform Function Results

```sql
SELECT * FROM transform_jp_people_groups_cache();
```

This returns:

- `people_groups_created` / `people_groups_updated`
- `people_groups_regions_created` / `people_groups_regions_updated`
- `languages_linked` / `languages_created`
- `unmatched_languages_count` / `unmatched_regions_count`
- `errors` (JSONB array of any issues)

## Troubleshooting

### Sync Function Timeouts

- Reduce `maxPages` in the request (try 10-20 pages)
- The sync script automatically handles this

### Missing Regions

- Some regions may not be in your seed data (e.g., FRA, NOR, CCK)
- These are logged in the `errors` array but don't block processing
- Add missing regions to seed data if needed

### Transform Function Errors

- Check the `errors` field in the transform function response
- Most errors are logged but don't stop processing
- Unmatched regions are skipped (logged but not inserted)

## Estimated Sync Times

- **Full initial sync**: ~2-3 hours (depending on API response times)
  - ~17,000+ people group instances across ~200+ pages
  - ~250 records per page
- **Weekly incremental sync**: ~5-10 minutes
  - 50 pages = ~12,500 records
  - Completes full sync over ~4 weeks

## Notes

- The sync function handles deletions automatically (removes entries not in API response)
- The transform function only inserts/updates (never deletes canonical data)
- Languages are auto-created if not found in your database
- Regions must exist in your seed data (unmatched regions are skipped)
