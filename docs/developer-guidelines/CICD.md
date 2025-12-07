# CI/CD Architecture - Monorepo

## Overview

The monorepo uses a unified CI/CD pipeline powered by GitHub Actions, with separate workflows for testing, backend deployment, frontend deployment (Vercel), and type publishing.

## Workflow Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     Feature Branch                          │
│                    (feature/*, fix/*)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Push / Create PR
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                      CI Workflow                            │
│   ✓ Backend: Lint, Type Check, Tests                       │
│   ✓ Frontend: Lint, Type Check, Tests, Build               │
│   ✓ Security: npm audit                                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ PR Approved & Merged
                      ↓
        ┌─────────────┴─────────────┐
        │                           │
        ↓ develop                   ↓ main
┌───────────────────┐      ┌────────────────────┐
│   Development     │      │    Production      │
│   Environment     │      │    Environment     │
└────────┬──────────┘      └─────────┬──────────┘
         │                           │
         ├── Backend Deploy          ├── Backend Deploy
         │   ├── Migrations          │   ├── Migrations
         │   ├── Functions           │   ├── Functions
         │   ├── Workers             │   ├── Workers
         │   └── R2 CORS             │   └── R2 CORS
         │                           │
         ├── Vercel Deploy           ├── Vercel Deploy
         │   ├── Project Dashboard   │   ├── Project Dashboard
         │   └── Partnership Dash    │   └── Partnership Dash
         │                           │
         └── Type Publishing         └── Type Publishing
             └── NPM (dev tag)           └── NPM (latest tag)
```

## Workflows in Detail

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**

- Push to feature branches (not main/develop)
- Pull requests to develop or main

**Jobs:**

#### Backend Job

```yaml
Runs on: ubuntu-latest
Steps:
1. Checkout code
2. Install pnpm
3. Install dependencies (pnpm install)
4. Run backend linting
5. Check backend formatting
6. Backend type check
7. Setup Deno for Edge Functions
8. Type check Edge Functions
9. Start Supabase locally
10. Wait for Supabase ready
11. Run backend tests
12. Stop Supabase
```

**Key Features:**

- Runs Supabase locally in Docker
- Tests actual database migrations
- Validates Edge Function types
- Runs commands directly in supabase directory

#### Frontend Job

```yaml
Runs on: ubuntu-latest
Steps:
1. Checkout code
2. Install pnpm
3. Install dependencies (pnpm install)
4. Run frontend linting (both apps)
5. Run frontend type checking (both apps)
6. Run frontend tests (both apps)
7. Test frontend builds (with dummy env vars)
```

**Key Features:**

- Tests both frontends in parallel using Turborepo
- Uses wildcard filtering: `pnpm --filter='./apps/web-*'`
- Builds with dummy env vars to verify build process
- Catches type errors before merge

#### Security Job

```yaml
Runs on: ubuntu-latest
Steps:
1. Checkout code
2. Install pnpm
3. Install dependencies
4. Run npm audit (high severity)
```

**Optimization Opportunities:**

- ✅ Already uses pnpm caching
- ✅ Jobs run in parallel
- 🔄 Could add Turborepo remote caching (future)

### 2. Backend Deploy - Development (`.github/workflows/deploy-backend-dev.yml`)

**Triggers:**

- Push to `develop` branch

**Environment:** `development` (recommended)

**Jobs:**

```yaml
deploy-dev:
  runs-on: ubuntu-latest
  environment: development  # Use GitHub Environment

  Steps:
  1. Checkout code
  2. Install pnpm + dependencies
  3. Setup Supabase CLI
  4. Link to dev Supabase project
  5. Deploy configuration (config.toml)
  6. Deploy database migrations (supabase db push)
  7. Deploy Edge Functions
  8. Setup AWS CLI for R2
  9. Deploy R2 CORS policies
  10. Deploy Cloudflare Workers
```

**Key Configuration:**

- Working directory: `supabase/`
- Uses environment-specific secrets (DEV_PROJECT_REF, etc.)
- Idempotent: Safe to run multiple times
- No data changes: Only schema migrations

**What Gets Deployed:**

- ✅ Database migrations
- ✅ Edge Functions (Deno)
- ✅ Cloudflare Workers (CDN, Package API)
- ✅ R2 CORS policies
- ✅ Supabase config (SMTP, auth settings)

**What Does NOT Get Deployed:**

- ❌ Frontend apps (Vercel handles this)
- ❌ Database data/seeds (migrations only)

### 3. Backend Deploy - Production (`.github/workflows/deploy-backend-prod.yml`)

**Triggers:**

- Push to `main` branch

**Environment:** `production` (recommended)

**Jobs:**
Identical to development but:

- Links to production Supabase project
- Uses production secrets (PROD_PROJECT_REF, etc.)
- Can have required reviewers (set in GitHub Environment)
- Deploys production CORS policies

### 4. Type Publishing - Development (`.github/workflows/publish-types-dev.yml`)

**Triggers:**

- After successful "Deploy Backend to Development" workflow
- Manual trigger (workflow_dispatch)

**Environment:** `development` (recommended)

**Jobs:**

```yaml
publish-dev:
  runs-on: ubuntu-latest
  environment: development

  Steps:
  1. Checkout code
  2. Install pnpm + dependencies
  3. Setup Supabase CLI
  4. Link to dev project
  5. Generate types from development database
     → supabase gen types typescript --linked > packages/shared-types/types/database.ts
  6. Build package artifacts (create .d.ts and .js files)
  7. Set prerelease version (1.0.2-dev.20250101.120000.123)
  8. Publish to NPM with "dev" tag
```

**Version Format:**

- Development: `1.0.2-dev.20250101.120000.123`
  - Base version from package.json
  - Timestamp: YYYYMMdd.HHMMSS
  - Run number: GitHub run counter

**NPM Tags:**

- Development publishes with: `--tag dev`
- Install with: `npm install @everylanguage/shared-types@dev`

### 5. Type Publishing - Production (`.github/workflows/publish-types-prod.yml`)

**Triggers:**

- After successful "Deploy Backend to Production" workflow
- Manual trigger (workflow_dispatch)

**Environment:** `production` (recommended)

**Jobs:**
Identical to development but:

- Generates types from production database
- Publishes with `latest` tag (default)
- Uses semantic version from package.json (no timestamp)

## Frontend Deployment (Vercel)

**Automatic Deployment:**

- Vercel watches the monorepo
- Detects changes in `apps/web-project-dashboard/` or `apps/web-partnership-dashboard/`
- Triggers builds automatically

**Build Configuration (Vercel Dashboard):**

```yaml
Project: web-project-dashboard
Root Directory: apps/web-project-dashboard
Build Command: cd ../.. && pnpm run build --filter=web-project-dashboard
Output Directory: dist
Install Command: pnpm install

Deployments: develop branch → Preview
  main branch → Production
```

```yaml
Project: web-partnership-dashboard
Root Directory: apps/web-partnership-dashboard
Build Command: cd ../.. && pnpm run build --filter=web-partnership-dashboard
Output Directory: dist
Install Command: pnpm install

Deployments: develop branch → Preview
  main branch → Production
```

**No GitHub Action needed** - Vercel handles:

- ✅ Building frontend
- ✅ Environment variables
- ✅ Preview deployments
- ✅ Production deployments
- ✅ Automatic HTTPS
- ✅ CDN caching

## Turborepo Optimizations

### Current Setup

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "types/**/*.js", "types/**/*.d.ts"]
    },
    "lint": {},
    "test": {},
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

### How Turborepo Helps

1. **Dependency Graph:**
   - Turborepo understands `shared-types` must build before frontends
   - `dependsOn: ["^build"]` means "build dependencies first"

2. **Caching:**
   - Local cache in `.turbo/` directory
   - Skips rebuilding unchanged packages
   - Hashed based on: inputs, outputs, dependencies

3. **Parallel Execution:**
   - Independent tasks run simultaneously
   - Example: Both frontends can build in parallel

### Potential Optimizations

#### 1. Remote Caching (Vercel)

```bash
# Enable remote caching
pnpm dlx turbo login
pnpm dlx turbo link

# Update turbo.json
{
  "remoteCache": {
    "enabled": true
  }
}
```

**Benefits:**

- CI builds reuse local developer caches
- Team shares build artifacts
- Drastically faster CI on unchanged code

#### 2. Prune for Deployments

```bash
# Generate minimal deployment
turbo prune --scope=web-project-dashboard --docker
```

**Benefits:**

- Smaller Docker images
- Faster deployments
- Only includes needed dependencies

#### 3. Affected Detection

```bash
# Only run tasks for changed apps
turbo run test --filter=[HEAD^1]
```

**Benefits:**

- Skip testing unchanged apps
- Faster CI on large monorepos

## Secret Management Strategy

### Recommended: GitHub Environments

**Development Environment:**

```
Name: development
Protection Rules:
  - Deployment branches: develop only
  - Required reviewers: none (faster iteration)

Secrets:
  SUPABASE_DEV_PROJECT_REF
  SUPABASE_DEV_DB_PASSWORD
  ... (development-specific)
```

**Production Environment:**

```
Name: production
Protection Rules:
  - Deployment branches: main only
  - Required reviewers: 1+ (safety)
  - Wait timer: 0 minutes (optional: add delay)

Secrets:
  SUPABASE_PROD_PROJECT_REF
  SUPABASE_PROD_DB_PASSWORD
  ... (production-specific)
```

**Shared Secrets:**
Some secrets can be shared across environments:

- `SUPABASE_ACCESS_TOKEN` (API token)
- `CLOUDFLARE_ACCOUNT_ID`
- `TWILIO_*` credentials (if same account)

**Benefits:**

- ✅ Clear separation
- ✅ Prevents accidents (can't deploy prod from dev branch)
- ✅ Audit trail per environment
- ✅ Can require approvals for production
- ✅ Better organization

## Best Practices

1. **Always test migrations locally first**

   ```bash
   supabase db reset
   ```

2. **Run CI checks before pushing**

   ```bash
   pnpm lint && pnpm type-check && pnpm test
   ```

3. **Use conventional commits**

   ```bash
   feat: add new feature
   fix: resolve bug
   chore: update dependencies
   ```

4. **Keep PRs focused**
   - One feature/fix per PR
   - Easier to review and rollback

5. **Monitor after merges**
   - Check Actions tab
   - Verify deployments succeeded
   - Test in deployed environment

## Future Enhancements

1. **Automated Rollback**
   - Detect failed health checks
   - Automatically revert to previous version

2. **Staging Environment**
   - Add `staging` branch between develop and main
   - Test production-like environment

3. **Performance Monitoring**
   - Add Sentry/DataDog to workflows
   - Track bundle sizes over time

4. **Automated Testing**
   - Add E2E tests with Playwright
   - Visual regression tests

5. **Dependency Updates**
   - Renovate bot for automatic PRs
   - Automated security patches
