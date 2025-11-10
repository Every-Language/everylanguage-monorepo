# Web Admin Dashboard

Admin dashboard for managing system-wide data and operations.

## Purpose

The admin dashboard provides system administrators with tools to:

- Manage reference data (languages, regions)
- View and manage donations and allocations
- Monitor system-wide operations
- Access user roles and permissions

## Stack

- **Framework**: React 19 with TypeScript 5.8
- **Build Tool**: Vite 7
- **Routing**: React Router v6
- **State Management**:
  - TanStack Query 5.83 for server state
  - Zustand 5.0 for client state (if needed)
- **Styling**: TailwindCSS with custom theme
- **UI Components**: Radix UI primitives + Headless UI
- **Backend**: Supabase (PostgreSQL + Auth)
- **Deployment**: Vercel

## Architecture

### Client-Side Routing

Uses React Router with:

- Public routes: `/login`, `/unauthorized`
- Protected routes: All other routes require authentication
- Lazy loading: Pages are code-split for performance

### State Management

- **TanStack Query**: Server state (API calls, caching, mutations)
- **Auth Context**: Authentication state via React Context
- **Zustand**: Client state (if needed for complex UI state)

### Authentication

- Supabase Auth integration
- Role-based access control (fetches user roles)
- Protected route wrapper component

## Codebase Organization

```
src/
├── features/          # Feature-based modules
│   ├── auth/         # Authentication
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── dashboard/    # Dashboard overview
│   ├── donations/    # Donations management
│   ├── languages/    # Language management
│   └── regions/      # Region management
├── shared/           # Shared code
│   ├── components/   # Reusable components
│   ├── query/        # TanStack Query setup
│   ├── services/     # API services (Supabase client)
│   └── theme/        # Theme configuration
├── App.tsx           # Root component with routing
└── main.tsx          # Entry point
```

### Feature Structure

Each feature follows this pattern:

- `components/` - Feature-specific components
- `pages/` - Page components (route handlers)
- `api/` - API queries/mutations (TanStack Query)
- `types.ts` - Feature-specific types

### Shared Code

- `shared/components/` - Reusable UI components
- `shared/query/` - Query client configuration
- `shared/services/` - Supabase client and API services
- `shared/theme/` - Theme provider and configuration

## Key Features

- **Languages Management**: CRUD operations for language entities
- **Regions Management**: CRUD operations for geographic regions
- **Donations**: View and manage donations
- **Allocations**: View and manage donation allocations
- **Dashboard**: System overview and statistics

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

## Environment Variables

See `env.example` for required environment variables. Main variables:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
