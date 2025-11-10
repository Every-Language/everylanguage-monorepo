# Every Language Monorepo

A monorepo containing the infrastructure and applications for Every Language, a platform for Bible translation projects that enables recording teams to create, manage, and publish audio Bible translations while tracking progress and enabling partner organizations to support language projects.

## 🏗️ Monorepo Structure

```
everylanguage-monorepo/
├── apps/                          # Frontend applications
│   ├── web-project-dashboard/     # Recording app dashboard (React + Vite)
│   ├── web-partnership-dashboard/ # Partner org dashboard (Next.js)
│   ├── web-admin-dashboard/       # Admin dashboard (React + Vite)
│   └── r2-media-cdn/              # Cloudflare R2 CDN service
├── packages/                      # Shared packages
│   ├── shared-types/              # Generated database types
│   └── shared-ui/                 # Shared UI components
├── supabase/                      # Backend (Supabase)
│   ├── migrations/                # Database migrations
│   ├── functions/                 # Edge Functions (Deno)
│   └── seed/                       # Database seeds
└── docs/                          # Documentation
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** 8+ (`npm install -g pnpm`)
- **Docker Desktop** (for local Supabase)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd everylanguage-monorepo

# Install dependencies
pnpm install

# Start local Supabase (requires Docker)
pnpm db:dev

# Generate TypeScript types from database
pnpm db:generate-types
pnpm db:prepare-package

# Start all apps in development mode
pnpm dev
```

### Individual App Development

```bash
# Project Dashboard
pnpm frontend:project:dev

# Partnership Dashboard
pnpm frontend:partnership:dev

# Admin Dashboard (via turbo)
pnpm --filter=web-admin-dashboard dev

# Edge Functions
pnpm db:functions:serve
```

## 📦 Applications

### Web Project Dashboard

Recording app dashboard for managing Bible translation projects, audio uploads, and content.

**Tech Stack:** React 19, TypeScript, Vite, TanStack Query, Zustand, TailwindCSS

**Purpose:**

- Create and manage translation projects
- Upload and manage audio/text files
- Mark verse timings in audio files
- Track project progress

📖 [Detailed Documentation](./docs/apps/web-project-dashboard/README.md)

### Web Partnership Dashboard

Partner organization dashboard for tracking Bible translation progress and supporting language projects.

**Tech Stack:** Next.js 15, React 19, TypeScript, TanStack Query, MapLibre GL

**Purpose:**

- View Bible translation progress on interactive map
- Track supported projects
- View project updates and media
- Manage organization profile
- View funding information

📖 [Detailed Documentation](./docs/apps/web-partnership-dashboard/README.md)

### Web Admin Dashboard

Admin dashboard for managing system-wide data and operations.

**Tech Stack:** React 19, TypeScript, Vite, TanStack Query, Zustand

**Purpose:**

- Manage reference data (languages, regions)
- View and manage donations and allocations
- Monitor system-wide operations
- Access user roles and permissions

📖 [Detailed Documentation](./docs/apps/web-admin-dashboard/README.md)

### R2 Media CDN

Cloudflare R2 service for serving media files.

📖 [Detailed Documentation](./docs/apps/r2-media-cdn/README.md)

## 🛠️ Tech Stack

### Frontend

- **React 19** with **TypeScript 5.8**
- **Vite 7** / **Next.js 15** (Turbopack)
- **TanStack Query 5.83** for server state
- **Zustand 5.0** for client state
- **TailwindCSS** for styling
- **Radix UI** + **Headless UI** for components

### Backend

- **Supabase** (PostgreSQL 17, Auth, Storage)
- **Deno Edge Functions** for serverless functions
- **Row Level Security (RLS)** for data access control
- **Custom RBAC** system for authorization

### Infrastructure

- **pnpm** workspaces for monorepo management
- **Turbo** for build orchestration and caching
- **Vercel** for frontend deployment
- **Cloudflare R2** for media storage

## 📋 Common Commands

### Development

```bash
pnpm dev                    # Start all apps in parallel
pnpm db:dev                 # Start local Supabase
pnpm db:stop                # Stop local Supabase
pnpm db:reset               # Reset local database
```

### Database

```bash
pnpm db:generate-types       # Generate TypeScript types from DB
pnpm db:prepare-package     # Build types package
pnpm db:functions:serve      # Serve Edge Functions locally
pnpm db:functions:deploy    # Deploy Edge Functions
```

### Code Quality

```bash
pnpm lint                   # Lint all workspaces
pnpm lint:fix               # Fix linting issues
pnpm format                 # Format code with Prettier
pnpm format:check           # Check formatting
pnpm type-check             # Type check all workspaces
pnpm test                   # Run all tests
```

### Build

```bash
pnpm build                  # Build all workspaces
```

## 📚 Documentation

### Getting Started

- [Development Setup Guide](./docs/developer-guidelines/development-setup.md) - Complete setup instructions
- [Environment Variables Guide](./docs/developer-guidelines/environment-variables-guide.md) - Environment configuration
- [CI/CD Documentation](./docs/developer-guidelines/CICD.md) - Deployment and CI/CD workflows

### Architecture

- [Database Documentation](./docs/database/README.md) - Database schema and domains
- [Authentication & Authorization](./docs/auth/overview.md) - Auth system overview
- [RBAC System](./docs/auth/rbac.md) - Role-based access control
- [RLS Policies](./docs/auth/rls-policies.md) - Row Level Security

### Applications

- [Project Dashboard](./docs/apps/web-project-dashboard/README.md)
- [Partnership Dashboard](./docs/apps/web-partnership-dashboard/README.md)
- [Admin Dashboard](./docs/apps/web-admin-dashboard/README.md)
- [R2 Media CDN](./docs/apps/r2-media-cdn/README.md)

## 🔄 Development Workflow

### Branch Strategy

- `main` - Production environment
- `develop` - Development environment (shared testing)
- `feature/*` - Feature branches

### Workflow

1. Create feature branch from `develop`
2. Develop locally with `pnpm dev`
3. Test and lint (`pnpm test && pnpm lint`)
4. Create PR to `develop`
5. Merge to `develop` → Auto-deploys to Development
6. Merge `develop` to `main` → Auto-deploys to Production

See [Development Setup Guide](./docs/developer-guidelines/development-setup.md) for detailed workflow.

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Test database functions
pnpm db:test

# Test specific workspace
pnpm --filter=web-project-dashboard test
```

## 🔐 Environment Variables

Each app has its own `env.example` file. See the [Environment Variables Guide](./docs/developer-guidelines/environment-variables-guide.md) for complete setup instructions.

Key variables:

- `VITE_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_STORAGE_BUCKET`

## 📝 Git Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `chore:` - Maintenance tasks
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `refactor:` - Code refactoring

**Important:** Never push directly to `main` or `develop` branches.

## 🤝 Contributing

1. Read the [Development Setup Guide](./docs/developer-guidelines/development-setup.md)
2. Create a feature branch from `develop`
3. Make your changes
4. Write tests for new features
5. Ensure all tests pass and code is linted
6. Create a PR to `develop`

## 📄 License
