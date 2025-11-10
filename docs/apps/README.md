# Applications

This directory contains documentation for all applications in the monorepo.

## Frontend Applications

- **[Web Admin Dashboard](./web-admin-dashboard/)** - Admin dashboard for managing system data
- **[Web Project Dashboard](./web-project-dashboard/)** - Recording app dashboard for translation projects
- **[Web Partnership Dashboard](./web-partnership-dashboard/)** - Partner org dashboard with map visualization

## Infrastructure

- **[R2 Media CDN](./r2-media-cdn/)** - Cloudflare Worker for secure media file access

## Common Stack

All frontend applications share:

- **React 19** with TypeScript 5.8
- **TanStack Query 5.83** for server state
- **TailwindCSS** for styling
- **Radix UI** + **Headless UI** for components
- **Supabase** for backend (PostgreSQL + Auth)
- **Vercel** for deployment (except R2 CDN)

## Architecture Patterns

### State Management

- **TanStack Query**: Server state (API calls, caching)
- **Zustand**: Client state (UI state, preferences)
- **React Context**: Authentication state

### Code Organization

- **Feature-based**: Code organized by feature/domain
- **Shared code**: Common components and utilities in `shared/`
- **Type safety**: Full TypeScript with shared types package

### Routing

- **Admin/Project Dashboards**: React Router v6
- **Partnership Dashboard**: Next.js App Router

## Development

Each app has its own development commands:

```bash
# Navigate to app directory
cd apps/{app-name}

# Install dependencies (from monorepo root)
pnpm install

# Start dev server
pnpm --filter {app-name} dev

# Build for production
pnpm --filter {app-name} build
```

## Related Documentation

- [Authentication & Authorization](../auth/) - Auth system used by all apps
- [Database](../database/) - Database schema and functions
- [Developer Guidelines](../developer-guidelines/) - Development setup and conventions
