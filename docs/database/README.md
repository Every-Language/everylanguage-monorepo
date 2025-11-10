# Database Documentation

This directory contains documentation for the database schema organized by domain.

## Domains

- **[Reference Data](./ref.md)** - Languages, regions, and reference tables
- **[Bible Data](./bible.md)** - Bible structure and content (versions, books, chapters, verses)
- **[Bible Progress](./bible-progress.md)** - Progress views and materialized views
- **[Analytics](./analytics.md)** - User behavior and app usage tracking
- **[User Data](./user-data.md)** - Personal user data (playlists, bookmarks, preferences)
- **[Finance](./finance.md)** - Financial system (donations, payments, accounting)
- **[Projects](./projects.md)** - Recording app workflow (projects, sequences, segments, media)
- **[User & RBAC](./user-rbac.md)** - Authentication, authorization, and organizational structure

## Domain Organization

Tables are organized by domain based on their purpose and usage patterns:

- **Reference data**: Relatively static, used across the system
- **Bible data**: Immutable structure, content that rarely changes
- **Bible progress**: Aggregated views for reporting
- **Analytics**: High-volume event data for tracking
- **User data**: Personal data with `user_id` (not `created_by`)
- **Finance**: Three-layer architecture (business logic, provider, accounting)
- **Projects**: Recording workflow with `created_by` (shared resources)
- **User & RBAC**: Authentication and authorization system

## Key Conventions

- **`user_id`**: Personal data owned by a user
- **`created_by`**: Shared resources created by a user
- **Soft deletes**: Many tables use `deleted_at` instead of hard deletes
- **PostGIS**: Geographic data uses PostGIS geometry types
- **RLS**: All tables have Row Level Security policies (see [RLS Policies](../auth/rls-policies.md))

## Additional Documentation

- **[Database Conventions](./conventions.md)** - Naming conventions, patterns, and best practices
- [Bible Structure Guide](./bible/bible-structure-guide.md) - How Bible data is structured
- [Progress Coverage](./bible/progress-coverage-and-refresh.md) - Progress calculation details
- [Frontend Analytics Guide](./analytics/frontend-analytics-guide.md) - Using analytics in frontend
- [Fuzzy Search API](./ref-languages-and-regions/fuzzy-search-api-guide.md) - Language/region search
- [Hierarchy API](./ref-languages-and-regions/hierarchy-api-guide.md) - Language/region hierarchies

## Related Documentation

- [Authentication & Authorization](../auth/) - RBAC and RLS system
