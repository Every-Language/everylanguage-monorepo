# GRN Transform Testing Plan

## Summary of Changes

The new transform function (`20251226000054_fix_grn_matching_simplified.sql`) implements **ISO-based matching** to prevent merging linguistically distinct languages that share the same name.

### Key Insight

**GRN children inherit their parent's ISO 639-3 code.** This means:

- Different ISO codes = Different languages (by definition)
- Same name + different ISO = Keep separate
- Example: "Kalagan: East" (ISO: kge) vs "Kalagan: East" (ISO: kqe) are DIFFERENT languages

## Critical Test Cases

### Test 1: Kalagan: East (MUST remain separate)

**Expected:** 2 separate dialect entities

| GRN ID | Name          | ISO | Parent   | Parent ISO |
| ------ | ------------- | --- | -------- | ---------- |
| 22807  | Kalagan: East | kge | Komering | kge        |
| 22808  | Kalagan: East | kqe | Kalagan  | kqe        |

**Why:** These are different languages in different countries (Indonesia vs Philippines)

### Test 2: Aari Dialects (should group correctly)

**Expected:** Most under "Aari" parent, except "Aari: Galila"

| GRN ID | Name         | ISO     | Expected Parent        |
| ------ | ------------ | ------- | ---------------------- |
| 6600   | Aari: Bako   | aiw     | Aari                   |
| 6601   | Aari: Biyo   | aiw     | Aari                   |
| 6602   | Aari: Galila | **gyl** | **Gayil** (different!) |
| 6603   | Aari: Gozza  | aiw     | Aari                   |
| 6604   | Aari: Laydo  | aiw     | Aari                   |

**Why:** "Aari: Galila" has different ISO (gyl) and different GRN parent (Gayil, not Aari)

### Test 3: Lorraine Franconian (MUST remain separate)

**Expected:** 2 separate dialect entities

| GRN ID | Name                | ISO | Parent          |
| ------ | ------------------- | --- | --------------- |
| 9893   | Lorraine Franconian | fra | French          |
| 25651  | Lorraine Franconian | pfl | Palatine German |

## Deployment Steps for Dev

### 1. Commit and Push Migrations

```bash
cd /Users/matthewchua/Documents/GitHub/everylanguage-monorepo

# Stage the migration
git add supabase/migrations/20251226000054_fix_grn_matching_simplified.sql

# Commit
git commit -m "fix(db): implement ISO-based GRN matching to prevent false merges

- Use ISO 639-3 codes as primary identifier for language distinction
- Prevent merging different languages with identical names (e.g., Kalagan: East)
- Match GRN parents to JP entities by shared ISO code
- Verify parent-child ISO inheritance before matching dialects
- Research findings documented in investigation notes"

# Push to develop
git push origin develop
```

### 2. Wait for CI/CD

Monitor GitHub Actions for "Deploy Backend to Development" workflow completion.

### 3. Clear Bad Data from Dev

Go to Supabase SQL Editor (dev project) and run:

```sql
BEGIN;

-- Soft-delete all GRN sources
UPDATE language_entity_sources
SET deleted_at = NOW()
WHERE source = 'grn'
  AND external_id_type = 'grn_language_id'
  AND deleted_at IS NULL;

-- Soft-delete entities that ONLY have GRN sources (were created by bad transform)
UPDATE language_entities
SET deleted_at = NOW()
WHERE id IN (
  SELECT le.id
  FROM language_entities le
  WHERE le.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM language_entity_sources les
      WHERE les.language_entity_id = le.id
        AND les.source = 'grn'
        AND les.external_id_type = 'grn_language_id'
    )
    AND NOT EXISTS (
      SELECT 1 FROM language_entity_sources les
      WHERE les.language_entity_id = le.id
        AND les.deleted_at IS NULL
        AND NOT (les.source = 'grn' AND les.external_id_type = 'grn_language_id')
    )
);

SELECT
  'Deleted ' || (SELECT COUNT(*) FROM language_entity_sources WHERE source = 'grn' AND external_id_type = 'grn_language_id' AND deleted_at IS NOT NULL) || ' GRN sources' as status
UNION ALL
SELECT
  'Deleted ' || (SELECT COUNT(*) FROM language_entities WHERE deleted_at IS NOT NULL AND deleted_at > NOW() - INTERVAL '1 minute') || ' entities' as status;

COMMIT;
```

### 4. Run New Transform

```sql
SELECT * FROM transform_language_caches_to_entities();
```

### 5. Validate Results

**Test 1: Check Kalagan: East**

```sql
SELECT
  le.name,
  parent.name as parent_name,
  les.external_id as grn_id,
  grn.iso639_3,
  parent_grn.language_name as grn_parent_name
FROM language_entities le
JOIN language_entity_sources les ON le.id = les.language_entity_id
  AND les.source = 'grn'
  AND les.external_id_type = 'grn_language_id'
  AND les.deleted_at IS NULL
JOIN grn_language_cache grn ON grn.grn_language_id::text = les.external_id
LEFT JOIN language_entities parent ON le.parent_id = parent.id
LEFT JOIN grn_language_cache parent_grn ON grn.parent_id = parent_grn.grn_language_id
WHERE le.name = 'Kalagan: East'
ORDER BY grn_id;
```

**Expected:** 2 rows, one with Komering parent (ISO kge), one with Kalagan parent (ISO kqe)

**Test 2: Check for duplicate names with different ISOs**

```sql
SELECT
  le.name,
  COUNT(DISTINCT grn.iso639_3) as iso_count,
  ARRAY_AGG(DISTINCT grn.iso639_3 ORDER BY grn.iso639_3) as iso_codes,
  COUNT(DISTINCT le.id) as entity_count
FROM language_entities le
JOIN language_entity_sources les ON le.id = les.language_entity_id
  AND les.source = 'grn'
  AND les.external_id_type = 'grn_language_id'
  AND les.deleted_at IS NULL
JOIN grn_language_cache grn ON grn.grn_language_id::text = les.external_id
GROUP BY le.name
HAVING COUNT(DISTINCT grn.iso639_3) > 1
ORDER BY iso_count DESC
LIMIT 20;
```

**Expected:** 0 rows (no entity should have sources with different ISO codes)

**Test 3: Run validation functions**

```sql
SELECT * FROM validate_grn_matching_summary();
```

## Expected Outcomes

✅ **Success Criteria:**

1. No entity has multiple GRN sources with different ISO codes
2. "Kalagan: East" exists as 2 separate entities
3. "Lorraine Franconian" exists as 2 separate entities
4. Aari dialects correctly grouped (except "Aari: Galila" under "Gayil")
5. All GRN cache entries have corresponding language_entity_sources

❌ **Known Acceptable Issues:**

- ~387 parent-child mismatches (edge cases we're accepting for now)
- Some dialects may be created as standalone languages if parent lacks ISO code

## Rollback Plan (if needed)

If the transform produces worse results:

```sql
-- Restore old GRN sources
UPDATE language_entity_sources
SET deleted_at = NULL
WHERE source = 'grn'
  AND external_id_type = 'grn_language_id'
  AND deleted_at > NOW() - INTERVAL '1 hour';

-- Delete new GRN sources
DELETE FROM language_entity_sources
WHERE source = 'grn'
  AND external_id_type = 'grn_language_id'
  AND created_at > NOW() - INTERVAL '30 minutes';
```

## Migration Files

- `20251226000048_clear_grn_language_id_sources_dev.sql` - Clears existing GRN sources (safe, soft-delete)
- `20251226000049_fix_grn_matching_in_transform_function.sql` - OLD version (will be replaced)
- `20251226000054_fix_grn_matching_simplified.sql` - NEW ISO-based matching
- `20251226000050_validate_grn_matching.sql` - Validation functions

## Next Steps After Successful Dev Testing

1. If validation passes on dev, apply same process to production
2. Document any edge cases discovered
3. Consider future enhancements (e.g., better handling of ISO-less parents)
