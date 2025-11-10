# Web Partnership Dashboard

Partner organization dashboard for tracking Bible translation progress and supporting language projects.

## Purpose

The partnership dashboard enables partner organizations to:

- View Bible translation progress on an interactive map
- Track projects they support
- View project updates and media
- Manage their organization profile
- View funding and donation information

## Stack

- **Framework**: Next.js 15 with React 19 and TypeScript 5.8
- **Build Tool**: Next.js (Turbopack)
- **Routing**: Next.js App Router (file-based routing)
- **State Management**:
  - TanStack Query 5.83 for server state
  - Zustand 5.0 for client state
- **Styling**: TailwindCSS with custom theme
- **UI Components**: Radix UI primitives + Headless UI
- **Maps**: MapLibre GL + Deck.gl for map visualization
- **Backend**: Supabase (PostgreSQL + Auth)
- **Deployment**: Vercel

## Architecture

### Next.js App Router

Uses Next.js 15 App Router with:

- Route groups: `(auth)`, `(public)` for route organization
- Server Components: Default for better performance
- Client Components: Marked with `'use client'` directive
- Middleware: Authentication and route protection

### State Management

- **TanStack Query**: Server state (projects, progress, analytics)
- **Zustand**: Client state (map state, UI preferences)
- **React Context**: Auth context for authentication

### Map Visualization

- MapLibre GL for base map rendering
- Deck.gl for data visualization layers
- Supercluster for point clustering
- Custom heatmap layers for listening data

## Codebase Organization

```
src/
├── app/              # Next.js App Router
│   ├── (auth)/      # Auth route group
│   ├── (public)/    # Public route group
│   ├── api/         # API routes
│   ├── layout.tsx   # Root layout
│   ├── page.tsx     # Home page
│   └── providers.tsx # Global providers
├── features/         # Feature-based modules
│   ├── auth/        # Authentication
│   ├── map/         # Map visualization
│   ├── partnerorgs/ # Partner org management
│   ├── projects/    # Project views
│   ├── funding/     # Funding/donation views
│   └── dashboard/   # Dashboard overview
├── components/       # Shared components
├── shared/          # Shared code
│   ├── components/   # Reusable components
│   ├── query/        # TanStack Query setup
│   ├── services/     # API services
│   └── theme/        # Theme configuration
├── lib/             # Library setup
│   ├── env.ts       # Environment validation
│   └── supabase/    # Supabase client setup
└── middleware.ts    # Next.js middleware
```

### Feature Structure

Each feature follows this pattern:

- `components/` - Feature-specific components
- `pages/` - Page components (if using pages router)
- `queries/` - TanStack Query hooks
- `types.ts` - Feature-specific types

### Route Groups

- `(auth)` - Authentication pages (login, register)
- `(public)` - Public pages (map, project views)

### Shared Code

- `shared/components/` - Reusable UI components
- `shared/query/` - Query client configuration
- `shared/services/` - API services
- `shared/theme/` - Theme provider and configuration

## Key Features

- **Interactive Map**: Visualize Bible translation progress worldwide
- **Project Tracking**: View projects and their progress
- **Project Updates**: View project status updates and media
- **Partner Org Management**: Manage organization profile
- **Funding Dashboard**: View funding and donation information
- **Progress Visualization**: Heatmaps and progress indicators

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test
```

## Environment Variables

See `env.example` for required environment variables. Main variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `MAPBOX_ACCESS_TOKEN` - MapLibre/Mapbox access token (if using)

## Next.js Specifics

- Uses App Router (not Pages Router)
- Server Components by default
- Client Components marked with `'use client'`
- Middleware for authentication
- Route groups for organization
