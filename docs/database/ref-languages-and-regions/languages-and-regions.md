# Reference Data Domain

Reference data contains relatively static information about languages and regions used throughout the system.

## Purpose

This domain stores:

- Language hierarchies (family → language → dialect → mother tongue)
- Region hierarchies (continent → country → state → district → etc.)
- Language-region associations
- Alternative names/aliases for searchability
- Metadata properties for languages and regions
- Exchange rates for currency conversion

## Tables

### `language_entities`

Hierarchical language taxonomy. Supports family → language → dialect → mother tongue relationships.

### `language_aliases`

Alternative names for languages to improve searchability (e.g., "English" vs "en" vs "eng").

### `language_properties`

Key-value metadata for languages (e.g., ISO codes, script types).

### `language_entity_sources`

External data sources for language information (e.g., Ethnologue, ISO 639).

### `language_entities_regions`

Many-to-many relationship between languages and regions, includes dominance level.

### `regions`

Hierarchical geographic regions with PostGIS geometry boundaries. Supports continent → country → state → district → town → village.

### `region_aliases`

Alternative names for regions (e.g., "USA" vs "United States").

### `region_properties`

Key-value metadata for regions (e.g., ISO country codes, population).

### `region_sources`

External data sources for region information.

### `exchange_rates`

Currency exchange rates fetched from external providers, used for financial calculations.

## Related Documentation

- [Functions & Triggers](./functions-and-triggers.md) - Reference data functions and triggers
- [Fuzzy Search API Guide](./fuzzy-search-api-guide.md) - Language/region search functions
- [Hierarchy API Guide](./hierarchy-api-guide.md) - Hierarchy navigation functions
