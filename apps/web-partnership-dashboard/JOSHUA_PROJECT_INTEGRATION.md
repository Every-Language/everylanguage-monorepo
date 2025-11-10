# Joshua Project API Integration

This document describes the Joshua Project API integration in the partnership dashboard map feature.

## Overview

The integration fetches gospel access data, people groups, and mission statistics from the Joshua Project API for selected regions and languages in the map inspector panel.

## Architecture

- **Client-side fetching**: React Query with 10-minute cache
- **API proxy**: Next.js API route secures the API key server-side
- **Modular sections**: 5 new inspector panel sections following existing patterns

## Environment Setup

Add the following environment variable to your `.env.local` file:

```bash
JOSHUA_PROJECT_API_KEY=your_api_key_here
```

Get your API key from: https://joshuaproject.net/api/

## Files Created

### API & Services
- `/src/app/api/joshua-project/route.ts` - Next.js API proxy endpoint
- `/src/features/map/services/joshuaProjectApi.ts` - TypeScript types and client functions
- `/src/features/map/hooks/useJoshuaProject.ts` - React Query hooks with caching

### Inspector Sections
- `/src/features/map/sections/JPGospelAccessSection.tsx` - Gospel progress, primary religion, resource availability
- `/src/features/map/sections/JPPeopleGroupsSection.tsx` - People groups list with sorting/filtering
- `/src/features/map/sections/JPCountryStatsSection.tsx` - Country statistics (regions only)
- `/src/features/map/sections/JPLanguageStatsSection.tsx` - Language statistics (languages only)
- `/src/features/map/sections/JPResourcesSection.tsx` - External resource links

### Configuration
- `/src/features/map/config/layoutTypes.ts` - Added new section types
- `/src/features/map/config/layouts.ts` - Integrated sections into layouts
- `/src/features/map/components/SectionRenderer.tsx` - Renders JP sections
- `/src/lib/env.ts` - Server-side environment config

## Data Mapping

The integration uses existing external ID mappings in your database:

### Regions → Countries
- Source table: `region_sources`
- Maps `iso3166-1-alpha3` codes → Joshua Project `ROG3` codes
- Example: Uruguay (region) → `URY` → Joshua Project country data

### Languages → Languages
- Source table: `language_entity_sources`  
- Maps `iso-639-3` codes → Joshua Project `ROL3` codes
- Example: Anufo (language) → `anu` → Joshua Project language data

## Features

### Gospel Access Section (Priority: Highest)
- Joshua Project Progress Scale (1-5)
- Primary religion and language
- Christian and Evangelical percentages
- Bible translation, JESUS Film, Audio Scripture availability
- Translation history (years completed)

### People Groups Section
- Sortable table by name, population, scale, or evangelical %
- Shows progress scale, primary religion, least reached status
- Pagination (10 per page with "Show All" option)
- Supports both country and language filtering

### Country Stats Section (Regions Only)
- Population, number of people groups and languages
- Religious breakdown with visual bars
- Geographic region and continent
- Development indicators (income level, internet, phone density)
- Security level (1-5 scale)

### Language Stats Section (Languages Only)
- Total population speaking language
- Number of countries and people groups
- Hub country
- Unreached populations (least reached, frontier groups)
- Religious context
- Bible translation status (full Bible, NT, portions)
- Primary text and audio availability

### Resources Section
- Collapsible categories:
  - Joshua Project profiles (country, language, top 3 people groups)
  - JESUS Film resources
  - Audio Scripture (Faith Comes By Hearing, GRN)
  - Bible translation organizations
  - General mission resources
  - Maps & geography links

## Section Display Logic

Sections only display when:
1. External ID mapping exists in database (ISO3 for regions, ISO639-3 for languages)
2. Data successfully fetches from Joshua Project API
3. Loading states show skeleton loaders
4. Missing data shows "No data available" message

## Caching Strategy

- **External IDs**: 1 hour staleTime (rarely changes)
- **Joshua Project data**: 10 minutes staleTime, 30 minutes gcTime
- **Next.js API route**: 10 minutes revalidate time
- No refetch on window focus
- Retry once on failure

## Testing

Test with known mapped entities:
- **Region**: Uruguay (URY) - has ISO3 mapping
- **Language**: Anufo (anu) - has ISO639-3 mapping

Verify:
- Sections appear/hide based on external ID availability
- Loading skeletons display during fetch
- Data populates correctly for each section type
- Cache prevents unnecessary refetches within 10 minutes
- Mobile bottom sheet renders all sections

## API Proxy Endpoint

```
GET /api/joshua-project?endpoint={endpoint}&{params}
```

Examples:
```
/api/joshua-project?endpoint=countries/URY
/api/joshua-project?endpoint=languages/anu
/api/joshua-project?endpoint=people_groups&ROG3=URY&limit=100
/api/joshua-project?endpoint=people_groups&ROL3=anu&limit=100
```

## Future Enhancements

- Server-side caching with Redis or database
- Materialized views for frequently accessed JP data
- Webhook integration for JP data updates
- Admin UI for managing external ID mappings
- More detailed people group profiles
- Prayer needs and mission opportunities

## Credits

Data provided by [Joshua Project](https://joshuaproject.net)


