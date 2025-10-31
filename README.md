# EverLanguage Monorepo

[![CI](https://github.com/Every-Language/everylanguage-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/Every-Language/everylanguage-monorepo/actions/workflows/ci.yml)
[![Deploy Backend](https://github.com/Every-Language/everylanguage-monorepo/actions/workflows/deploy-backend-dev.yml/badge.svg)](https://github.com/Every-Language/everylanguage-monorepo/actions/workflows/deploy-backend-dev.yml)

Unified monorepo for EverLanguage platform - Supabase backend infrastructure, frontend applications, and shared packages.

## 📁 Repository Structure

```
everylanguage-monorepo/
├── apps/
│   ├── backend/                    # Supabase backend infrastructure
│   │   ├── supabase/              # Database migrations, functions, config
│   │   ├── cloudflare/            # Cloudflare Workers & R2 storage
│   │   ├── backblaze/             # Backblaze B2 configuration
│   │   └── scripts/               # Utility scripts
│   └── frontend/
│       ├── web-project-dashboard/ # Project & media management app
│       └── web-partnership-dashboard/ # Map analytics & partnership portal
├── packages/
│   └── shared-types/              # Database TypeScript types (published to NPM)
├── docs/                          # Documentation
│   ├── backend/                   # Backend docs
│   └── frontend/                  # Frontend docs
└── .github/workflows/             # CI/CD pipelines
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18+ (backend), 20+ (frontends)
- **pnpm**: 8+ (package manager)
- **Docker Desktop**: For local Supabase development
- **Supabase CLI**: `npm install -g supabase`

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/Every-Language/everylanguage-monorepo.git
cd everylanguage-monorepo

# Install all dependencies
pnpm install

# Start backend (Supabase)
pnpm backend:dev

# In separate terminals, start frontends
pnpm frontend:project:dev
pnpm frontend:partnership:dev
```

## 📜 Available Scripts

### Workspace-wide Commands

```bash
pnpm dev                    # Start all apps in parallel
pnpm build                  # Build all apps
pnpm lint                   # Lint all code
pnpm test                   # Run all tests
pnpm type-check            # Type check all TypeScript
```

### Backend Commands

```bash
pnpm backend:dev                    # Start Supabase locally
pnpm backend:stop                   # Stop Supabase
pnpm backend:reset                  # Reset local database
pnpm backend:generate-types         # Generate TypeScript types
pnpm backend:functions:serve        # Serve Edge Functions locally
pnpm backend:functions:deploy       # Deploy Edge Functions
```

### Frontend Commands

```bash
pnpm frontend:project:dev           # Start project dashboard
pnpm frontend:partnership:dev       # Start partnership dashboard
pnpm --filter=web-project-dashboard build
pnpm --filter=web-partnership-dashboard build
```

## 🏗️ Architecture

### Technology Stack

**Backend:**
- PostgreSQL (Supabase)
- Supabase Edge Functions (Deno)
- Cloudflare Workers & R2 Storage
- Backblaze B2

**Frontend:**
- React 19
- Vite
- TypeScript
- TanStack Query
- Tailwind CSS
- MapLibre GL (partnership dashboard)

**Tooling:**
- **pnpm**: Fast, efficient package manager
- **Turborepo**: Build system and task orchestration
- **GitHub Actions**: CI/CD pipelines
- **Vercel**: Frontend deployments

## 📦 Type System

### Shared Types Package

Database types are automatically generated from Supabase schema and published to NPM as `@everylanguage/shared-types`.

**Within Monorepo:**
- Frontends use `workspace:*` reference for instant type updates
- No need to publish/install during development

**External Consumers:**
```bash
npm install @everylanguage/shared-types@latest  # Production
npm install @everylanguage/shared-types@dev     # Development
```

**Generating Types:**
```bash
# 1. Update database schema via migration
cd apps/backend
supabase migration new my_migration

# 2. Generate types
pnpm backend:generate-types

# 3. Frontends see updated types immediately
```

## 🔄 Development Workflow

### Creating a Feature

```bash
# 1. Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# 2. Make changes and test locally
pnpm dev                    # Start all apps
pnpm lint                   # Check code quality
pnpm type-check             # Verify types
pnpm test                   # Run tests

# 3. Commit and push
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature

# 4. Create PR to develop
# CI automatically runs tests and checks
```

### Branch Strategy

- **main**: Production environment
- **develop**: Development environment
- **feature/***: Feature branches (CI only)

### CI/CD Pipeline

**On Feature Branches:**
- ✅ Backend linting & type checking
- ✅ Frontend linting & type checking
- ✅ Test suite execution
- ✅ Build verification
- ✅ Security scanning

**On develop → Development:**
- 🚀 Backend: Deploy migrations, functions, workers
- 🚀 Frontend: Auto-deploy to Vercel preview
- 📦 Types: Publish to NPM with `dev` tag

**On main → Production:**
- 🚀 Backend: Deploy migrations, functions, workers
- 🚀 Frontend: Auto-deploy to Vercel production
- 📦 Types: Publish to NPM with `latest` tag

## 🎯 Vercel Configuration

Both frontend apps deploy to Vercel automatically. Update your Vercel project settings:

### Web Project Dashboard

- **Root Directory**: `apps/frontend/web-project-dashboard`
- **Build Command**: `cd ../../.. && pnpm run build --filter=web-project-dashboard`
- **Output Directory**: `apps/frontend/web-project-dashboard/dist`
- **Install Command**: `pnpm install`

### Web Partnership Dashboard

- **Root Directory**: `apps/frontend/web-partnership-dashboard`
- **Build Command**: `cd ../../.. && pnpm run build --filter=web-partnership-dashboard`
- **Output Directory**: `apps/frontend/web-partnership-dashboard/dist`
- **Install Command**: `pnpm install`

## 📚 Documentation

- **Backend**: [`docs/backend/`](./docs/backend/)
  - [CI/CD Pipeline](./docs/backend/guidelines/ci-cd-pipeline.md)
  - [Schema Changes](./docs/backend/guidelines/schema-changes-guide.md)
  - [RBAC & RLS](./docs/backend/rbac/rbac-and-rls.md)
  - [Migration Guide](./docs/backend/migration/)

- **Frontends**: [`docs/frontend/`](./docs/frontend/)
  - [Project Dashboard](./docs/frontend/web-project-dashboard/)
  - [Partnership Dashboard](./docs/frontend/web-partnership-dashboard/)

## 🤝 Contributing

1. Work on feature branches
2. Follow conventional commits
3. Ensure all tests pass
4. Keep type definitions up to date
5. Update documentation as needed

## 🔐 Environment Variables

Each app maintains its own `.env` files:

```bash
apps/backend/.env.local
apps/frontend/web-project-dashboard/.env.local
apps/frontend/web-partnership-dashboard/.env.local
```

See respective app directories for `.env.example` files.

## 🛟 Troubleshooting

### pnpm Issues

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Type Generation Issues

```bash
# Ensure Supabase is running
cd apps/backend
supabase start

# Regenerate types
pnpm backend:generate-types
```

### Build Failures

```bash
# Check for type errors
pnpm type-check

# Rebuild everything from scratch
rm -rf apps/*/dist packages/*/dist
pnpm build
```

## 📄 License

ISC

