## Pre-initialized PowerSync App DB (Bible Structure)

### TL;DR

Ship a pre-initialized SQLite database (schema + static Bible structure + indexes + meta flags) as an app asset and copy it on first run to the app DB location. This eliminates the current first-run seeding time (~17.5s) and reduces it to a single file copy (<1–2s, often <500ms). Keep the current ATTACH-based seed as a safe fallback.

### Problem / Motivation

- Current cold start performs a one-time seed: `ATTACH seed.db → INSERT INTO … SELECT (books/chapters/verses/bible_versions) → compute global_order → mark meta`.
- Even after optimizations, initial seed takes ~17.5s on device (includes asset fetch, bulk inserts, index updates).
- This delays connecting to backend and adds perceived boot latency on the first run.

### Goals

- Reduce first-run initialization from ~17.5s to <2s by copying a prebuilt DB.
- Preserve offline-first behavior and correctness of preloaded structure data.
- Maintain a robust fallback path if asset is missing or version mismatched.

### Non-Goals

- Preloading dynamic/synced content (e.g., verse texts, media). Only the static structure tables are included.
- Removing the existing seed path. It remains as a fallback.

### User Impact

- First-time app launch is near-instant to UI. DB is ready immediately.
- Subsequent launches are unchanged (fast). No behavioral change for users.

### Technical Approach

1. Build-time: generate pre-initialized DB asset

- Script: `scripts/generate-preinit-app-db.cjs`
  - Input: `assets/data/bible-structure.json`
  - Output: `assets/seed/powersync-preinit.db`
  - Steps:
    - Create tables for: `bible_versions`, `books`, `chapters`, `verses` with the exact columns used by `AppSchema` (including `global_order`).
    - Insert rows with `global_order` precomputed (reuse logic from `generate-bible-seed-db.cjs`).
    - Create indexes for these four tables per `powersync/schema-indexes.ts` (e.g., `books(global_order)`, `chapters(book_id, global_order)`, `verses(chapter_id, global_order)`).
    - Create `__meta` table and set:
      - `('bible_seed_v1','done')`
      - `('preinit_db_version','1')` (bump when structure schema changes)
    - Apply build-time PRAGMAs for speed and run `VACUUM` to compact.
- Bundle: Ensure `app.config.ts` (or `app.json`) includes `assets/seed/powersync-preinit.db` in `assetBundlePatterns` so release builds ship with it.

2. Runtime: restore preinit DB before DB init

- In `PowerSyncSystem.initialize()`:
  - Determine the target DB path used by OP-SQLite:
    - Preferred: configure `OPSqliteOpenFactory` with an absolute path in `FileSystem.documentDirectory` (e.g., `${documentDirectory}powersync-everylanguage.db`).
  - If the DB file does not exist, copy `powersync-preinit.db` asset to the target path.
  - Skip the seed entirely when `__meta.bible_seed_v1` is present.
- Fallback:
  - If copy fails, asset is missing, or version mismatches, fall back to the existing `ATTACH seed` seeding path.

3. Versioning + Safety

- Version key: `preinit_db_version` in `__meta` (string). Also optionally set `PRAGMA user_version` to 1.
- At runtime, compare against a constant in code (e.g., `PREINIT_DB_VERSION = '1'`).
  - If the version mismatches:
    - Attempt a lightweight SQL migration (e.g., add missing columns/indexes), or
    - Overwrite with the new preinit asset if safe, or
    - Fall back to the `ATTACH`-based seed logic.
- Keep existing seed logic as a safety net.

### Detailed Runtime Flow (cold start)

1. App launches → `PowerSyncSystem.initialize()`
2. If target DB file missing → copy `powersync-preinit.db` to target path
3. Open DB → verify `__meta.bible_seed_v1 = 'done'` → skip seed
4. Proceed with normal startup (auth ensureSessionIfOnline, migration post-seed, connection)

### Data Model Scope

- Included in preinit DB:
  - `bible_versions(id, name, structure_notes)`
  - `books(id, name, book_number, testament, bible_version_id, global_order)`
  - `chapters(id, book_id, chapter_number, total_verses, global_order)`
  - `verses(id, chapter_id, verse_number, global_order)`
  - `__meta(__key, __value)`
- Excluded: all dynamic/synced tables (text*versions, verse_texts, media*\_, user\_\_ etc.). These remain empty locally until synced/used.

### Telemetry & Logging

- Log preinit copy start/finish with elapsed ms.
- Log whether preinit was used or fallback taken.
- Retain seed timing logs as a fallback path for diagnostics.

### Risks & Mitigations

- Schema drift: Ensure preinit DB matches `AppSchema` (CI job can compare and fail on mismatch). Use `preinit_db_version` to control compatibility.
- Asset size: DB size increases APK/IPA slightly (structure tables only; acceptable). Use `VACUUM` to minimize size.
- Platform differences: Validate file paths on iOS/Android. Always fallback to seed if copy/attach fails.
- Future structure changes: Bump `preinit_db_version`, rebuild asset, keep fallback.

### Acceptance Criteria

- First-run cold start:
  - DB ready by copy within <2s on mid-tier Android device.
  - No seed logs unless fallback path triggered.
- Subsequent runs: unchanged performance.
- If preinit asset missing or invalid: app still boots via fallback seed.

### Rollout Plan

- Behind auto-detection (no user-visible flag): use preinit if present and version-compatible, else fallback.
- Observe logs in internal builds/TestFlight; confirm preinit path used and elapsed times.
- Roll out to production after confirming stability.

### Implementation Tasks

- Build-time
  - [ ] Create `scripts/generate-preinit-app-db.cjs` (tables, inserts, indexes, meta, PRAGMAs, VACUUM)
  - [ ] Add `assets/seed/powersync-preinit.db` to repo and `assetBundlePatterns`
  - [ ] CI step or manual step to regenerate when structure changes
- Runtime
  - [ ] Add preinit restore logic in `PowerSyncSystem.initialize()` before DB init
  - [ ] Add version check (`preinit_db_version`) and fallback path
  - [ ] Add logs/timing for preinit vs fallback
- Testing
  - [ ] Cold start on clean installs (Android real device + iOS simulator) uses preinit (no seed)
  - [ ] Force fallback scenario (remove asset or bump version) seeds successfully
  - [ ] Verify indexes exist and `global_order` is populated

### Open Questions

- Do we standardize the OP-SQLite DB path to `documentDirectory` (simplifies copy) or discover it dynamically? Recommendation: standardize.
- Should we include any other static reference tables in preinit? (Probably not necessary now.)

### Appendix

- Example meta rows:

```sql
INSERT OR REPLACE INTO __meta (__key, __value) VALUES ('bible_seed_v1', 'done');
INSERT OR REPLACE INTO __meta (__key, __value) VALUES ('preinit_db_version', '1');
```
