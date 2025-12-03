# Transform Functions Guide

This guide explains how to manually invoke the transform functions that convert data from cache tables into canonical base tables.

## Overview

You have **4 transform functions** that process cache data:

1. `transform_language_caches_to_entities()` - Transforms language caches → `language_entities`
2. `transform_jp_countries_cache_to_regions()` - Transforms countries cache → `regions`
3. `transform_jp_people_groups_cache()` - Transforms people groups cache → `people_groups`
4. `transform_grn_coordinates_cache_to_language_entities_regions()` - Transforms coordinates cache → `language_entities_regions`

## Execution Order

Run these functions in this order due to dependencies:

1. **Languages first** (needed by people groups and coordinates)
2. **Countries/Regions second** (needed by people groups and coordinates)
3. **People Groups third** (depends on languages and regions)
4. **Coordinates last** (depends on languages and regions)

## Function Details

### 1. `transform_language_caches_to_entities()`

**Purpose:** Transforms `jp_language_cache` and `grn_language_cache` into the `language_entities` system.

**Parameters:** None

**Returns:** Table with counts:

- `jp_processed`, `jp_entities_created`, `jp_entities_matched`, `jp_sources_created`, `jp_aliases_created`, `jp_regions_linked`
- `grn_processed`, `grn_entities_created`, `grn_entities_matched`, `grn_sources_created`, `grn_aliases_created`

**Invoke via SQL:**

```sql
SELECT * FROM transform_language_caches_to_entities();
```

**Invoke via cURL (REST API):**

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/rpc/transform_language_caches_to_entities' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

**Invoke via Supabase Client (TypeScript):**

```typescript
const { data, error } = await supabase.rpc(
  'transform_language_caches_to_entities'
);
```

---

### 2. `transform_jp_countries_cache_to_regions()`

**Purpose:** Transforms `jp_countries_cache` into the canonical `regions` table.

**Parameters:** None

**Returns:** Table with counts:

- `countries_processed`, `countries_matched`, `countries_created`
- `regions_updated`, `sources_created`, `aliases_created`
- `errors` (JSONB)

**Invoke via SQL:**

```sql
SELECT * FROM transform_jp_countries_cache_to_regions();
```

**Invoke via cURL (REST API):**

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/rpc/transform_jp_countries_cache_to_regions' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

**Invoke via Supabase Client (TypeScript):**

```typescript
const { data, error } = await supabase.rpc(
  'transform_jp_countries_cache_to_regions'
);
```

---

### 3. `transform_jp_people_groups_cache()`

**Purpose:** Transforms `jp_people_groups_cache` into canonical `people_groups` and `people_groups_regions` tables.

**Parameters:**

- `batch_size` (INTEGER, default: 1000) - Number of entries to process per batch (max: 5000)
- `start_offset` (INTEGER, default: 0) - Offset for batch processing

**Returns:** Table with counts:

- `people_groups_created`, `people_groups_updated`
- `people_groups_regions_created`, `people_groups_regions_updated`
- `languages_linked`, `languages_created`
- `unmatched_languages_count`, `unmatched_regions_count`
- `errors` (JSONB)
- `processed_count`, `total_remaining`

**Note:** This function uses batch processing to prevent timeouts. You may need to call it multiple times until `total_remaining` is 0.

**Invoke via SQL (default batch):**

```sql
SELECT * FROM transform_jp_people_groups_cache();
```

**Invoke via SQL (custom batch):**

```sql
SELECT * FROM transform_jp_people_groups_cache(1000, 0);
```

**Invoke via cURL (REST API) - default batch:**

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/rpc/transform_jp_people_groups_cache' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Invoke via cURL (REST API) - custom batch:**

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/rpc/transform_jp_people_groups_cache' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"batch_size": 1000, "start_offset": 0}'
```

**Invoke via Supabase Client (TypeScript):**

```typescript
// Default batch
const { data, error } = await supabase.rpc('transform_jp_people_groups_cache');

// Custom batch
const { data, error } = await supabase.rpc('transform_jp_people_groups_cache', {
  batch_size: 1000,
  start_offset: 0,
});
```

**Batch Processing Example:**

```bash
# Process in batches until complete
OFFSET=0
while true; do
  RESULT=$(curl -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/rpc/transform_jp_people_groups_cache' \
    -H 'apikey: YOUR_ANON_KEY' \
    -H 'Authorization: Bearer YOUR_ANON_KEY' \
    -H 'Content-Type: application/json' \
    -d "{\"batch_size\": 1000, \"start_offset\": $OFFSET}")

  TOTAL_REMAINING=$(echo $RESULT | jq '.[0].total_remaining')
  echo "Processed batch starting at offset $OFFSET. Remaining: $TOTAL_REMAINING"

  if [ "$TOTAL_REMAINING" -eq 0 ]; then
    break
  fi

  OFFSET=$((OFFSET + 1000))
done
```

---

### 4. `transform_grn_coordinates_cache_to_language_entities_regions()`

**Purpose:** Transforms `grn_language_coordinates_cache` into `language_entities_regions` table.

**Parameters:** None

**Returns:** Table with counts:

- `processed`, `matched`, `upserted`
- `skipped_no_language_entity`, `skipped_no_region`

**Invoke via SQL:**

```sql
SELECT * FROM transform_grn_coordinates_cache_to_language_entities_regions();
```

**Invoke via cURL (REST API):**

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/rpc/transform_grn_coordinates_cache_to_language_entities_regions' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

**Invoke via Supabase Client (TypeScript):**

```typescript
const { data, error } = await supabase.rpc(
  'transform_grn_coordinates_cache_to_language_entities_regions'
);
```

---

## Complete Workflow Example

Here's a complete example of running all transform functions in order:

```bash
# Set your project details
PROJECT_URL="https://YOUR_PROJECT.supabase.co"
API_KEY="YOUR_ANON_KEY"

# 1. Transform language caches
echo "Step 1: Transforming language caches..."
curl -X POST "$PROJECT_URL/rest/v1/rpc/transform_language_caches_to_entities" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json"

# 2. Transform countries cache
echo "Step 2: Transforming countries cache..."
curl -X POST "$PROJECT_URL/rest/v1/rpc/transform_jp_countries_cache_to_regions" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json"

# 3. Transform people groups cache (with batch processing)
echo "Step 3: Transforming people groups cache..."
OFFSET=0
while true; do
  RESULT=$(curl -s -X POST "$PROJECT_URL/rest/v1/rpc/transform_jp_people_groups_cache" \
    -H "apikey: $API_KEY" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"batch_size\": 1000, \"start_offset\": $OFFSET}")

  TOTAL_REMAINING=$(echo $RESULT | jq -r '.[0].total_remaining // 0')
  PROCESSED=$(echo $RESULT | jq -r '.[0].processed_count // 0')
  echo "  Processed $PROCESSED entries. Remaining: $TOTAL_REMAINING"

  if [ "$TOTAL_REMAINING" -eq 0 ] || [ "$PROCESSED" -eq 0 ]; then
    break
  fi

  OFFSET=$((OFFSET + 1000))
done

# 4. Transform GRN coordinates cache
echo "Step 4: Transforming GRN coordinates cache..."
curl -X POST "$PROJECT_URL/rest/v1/rpc/transform_grn_coordinates_cache_to_language_entities_regions" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json"

echo "All transforms complete!"
```

---

## After Running Transforms

After running any transform function, you should refresh the materialized views:

```sql
-- Refresh all stats materialized views
SELECT refresh_all_stats_mvs();
```

Or refresh individually:

```sql
SELECT refresh_mv_language_stats();
SELECT refresh_mv_region_stats();
SELECT refresh_mv_people_group_stats();
SELECT refresh_language_coordinates_map();
```

---

## Notes

- All functions use `security definer` and run with elevated privileges
- Functions are idempotent - safe to run multiple times
- Functions only insert/update - they never delete canonical table rows
- The `transform_jp_people_groups_cache` function uses batch processing to prevent timeouts on large datasets
- Check the `errors` field in the response for any issues during processing
