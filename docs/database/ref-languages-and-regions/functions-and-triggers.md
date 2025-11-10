# Reference Data Functions & Triggers

Functions and triggers related to languages, regions, and reference data.

## Region Spatial Functions

### `refresh_region_spatial_cache(p_region_id UUID)`

Refreshes precomputed spatial data for a region (bounding box, center point, simplified boundary).

- Used for: Performance optimization for map rendering
- Updates: `bbox_min_lon`, `bbox_min_lat`, `bbox_max_lon`, `bbox_max_lat`, `center_lon`, `center_lat`, `boundary_simplified`
- Trigger: Automatically called when region boundary changes

### `get_region_bbox_by_id(p_region_id UUID)`

Returns bounding box coordinates for a region.

- Returns: `min_lon`, `min_lat`, `max_lon`, `max_lat`
- Used for: Map viewport calculations

### `get_region_boundary_simplified_by_id(p_region_id UUID)`

Returns simplified boundary geometry for overlay rendering.

- Returns: Simplified `MULTIPOLYGON` geometry
- Used for: Lightweight map overlays

### `get_region_minimal_by_point(lon DOUBLE PRECISION, lat DOUBLE PRECISION)`

Finds the smallest region containing a point.

- Returns: Region ID, name, level, and hierarchy path
- Used for: Reverse geocoding (point → region)

### `get_region_header_and_properties_by_id(p_region_id UUID)`

Returns region metadata including properties.

- Returns: Region header data and key-value properties
- Used for: Region detail pages

### `get_country_code_from_point(lon DOUBLE PRECISION, lat DOUBLE PRECISION)`

Returns ISO country code for a geographic point.

- Returns: 2-letter ISO country code (e.g., "US", "GB")
- Used for: Analytics geographic attribution

### `list_languages_for_region(p_region_id UUID, max_results INTEGER DEFAULT 50)`

Lists languages associated with a region.

- Returns: Language entities with dominance levels
- Used for: Region detail pages showing languages

## Language Functions

### `recommend_language_versions(filter_type, max_results, lookback_days, include_regions)`

Returns language versions ranked by recent popularity (listening data).

- Parameters:
  - `filter_type`: `audio_only`, `text_only`, `both_required`, `either`
  - `max_results`: Limit (default: 30)
  - `lookback_days`: Popularity window (default: 90)
  - `include_regions`: Include region data (default: false)
- Returns: Same shape as `search_language_aliases_with_versions` for UI reuse
- Used for: Pre-type suggestions, popular languages

## Triggers

### `refresh_region_spatial_cache`

**Trigger** - Automatically refreshes spatial cache when region boundaries change.

- Fires on: `UPDATE` of `boundary` on `regions`
- Calls: `refresh_region_spatial_cache()` function

## Related Documentation

- [Fuzzy Search API Guide](./fuzzy-search-api-guide.md) - Language/region search functions
- [Hierarchy API Guide](./hierarchy-api-guide.md) - Hierarchy navigation functions
