# Environment Variables Guide

This guide explains how environment variables are managed across the monorepo.

## Overview

The monorepo uses a **three-tier environment variable system**:

1. **Root-level shared variables** (`.env.local` at monorepo root) - For local development
2. **App-specific overrides** (`.env.local` in each app) - For app-specific config
3. **Deployment secrets** (`secrets/` directory) - For CI/CD and production

## Directory Structure

```
/monorepo-root/
  .env.local              # ✅ Shared dev environment (all apps)
  .env.example            # Template for local setup

  apps/
    web-project-dashboard/
      .env.local          # Optional: app-specific overrides
      env.example         # Documents app-specific vars
    web-partnership-dashboard/
    web-admin-dashboard/

  secrets/                # Deployment-time secrets
    .env.development      # Dev deployment (Vercel preview, GitHub Actions)
    .env.production       # Prod deployment (Vercel production)
    .env.shared           # Shared across environments
```

## 1. Root-Level Shared Variables (Local Development)

**Location:** `/monorepo-root/.env.local` (gitignored)

**Purpose:** Shared environment variables for local development across all React apps.

**Contains:**

- Supabase URL and keys
- Stripe publishable keys
- Map provider keys
- Any shared API endpoints

**Example:**

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Stripe (optional)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Map providers (optional)
VITE_MAPTILER_KEY=...
VITE_MAP_STYLE_URL=...
```

### How It Works

Each app's `vite.config.ts` includes:

```typescript
export default defineConfig({
  // Load environment variables from monorepo root
  envDir: path.resolve(__dirname, '../..'),
  // ... other config
});
```

This tells Vite to look for `.env` files at the monorepo root first, then check for app-specific overrides.

## 2. App-Specific Overrides (Optional)

**Location:** `/apps/<app-name>/.env.local` (gitignored)

**Purpose:** Override root-level variables or add app-specific configuration.

**When to use:**

- Testing different API endpoints for one app
- App-specific feature flags
- App-specific third-party keys

**Example use case:**

```bash
# Override Supabase URL for testing a specific app
VITE_SUPABASE_URL=https://staging-project.supabase.co

# App-specific feature flag
VITE_ENABLE_BETA_FEATURE=true
```

**Note:** Most of the time, you won't need app-specific `.env.local` files. The root-level file is sufficient for shared backend services.

## 3. Deployment Secrets

**Location:** `/secrets/` directory

**Purpose:** Secrets for CI/CD pipelines and production deployments.

See `/secrets/README.md` for details on:

- `.env.shared` - Repository-level secrets
- `.env.development` - Dev/preview deployments
- `.env.production` - Production deployments

These are deployed to:

- GitHub Actions (repository + environment secrets)
- Vercel (preview + production environments)
- Supabase Edge Functions (development + production projects)

## Setup Instructions

### For New Developers

1. **Copy the root environment example:**

   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your values:**
   - Get Supabase URL and anon key from your team
   - Add any optional keys you need (Stripe, Maps, etc.)

3. **Test that it works:**
   ```bash
   pnpm run dev
   ```
   All three dashboards should start and connect to Supabase.

### For Existing Developers (Migration)

If you already have app-specific `.env.local` files:

1. **Create root `.env.local`:**

   ```bash
   # Copy from any existing app (they should all be identical)
   cp apps/web-project-dashboard/.env.local .env.local
   ```

2. **Remove duplicate app-level `.env.local` files:**

   ```bash
   # Only do this if your apps all use identical configs
   rm apps/web-project-dashboard/.env.local
   rm apps/web-partnership-dashboard/.env.local
   rm apps/web-admin-dashboard/.env.local
   ```

3. **Test that everything still works:**
   ```bash
   pnpm run dev
   ```

## Environment Variable Precedence

Vite loads environment variables in this order (later sources override earlier ones):

1. `.env` - Committed defaults (if any)
2. `.env.local` - Local overrides (gitignored)
3. `.env.[mode]` - Mode-specific (e.g., `.env.production`)
4. `.env.[mode].local` - Mode-specific local overrides

With our setup using `envDir`:

1. **Root** `.env.local` (shared)
2. **App-specific** `.env.local` (overrides root)

## Turbo Cache Considerations

The root `turbo.json` defines `globalEnv` variables:

```json
{
  "globalEnv": [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_API_BASE_URL",
    "VITE_STRIPE_PUBLISHABLE_KEY",
    "VITE_STRIPE_PK",
    "VITE_MAP_STYLE_URL"
  ]
}
```

These variables affect Turbo's cache invalidation. If you add new environment variables that affect build output, add them to `globalEnv`.

## Best Practices

### ✅ DO:

- Use root `.env.local` for shared backend services
- Use app-specific `.env.local` only for true app-specific overrides
- Prefix all Vite env vars with `VITE_`
- Use `.env.example` files to document required variables
- Add new build-affecting vars to `turbo.json` `globalEnv`

### ❌ DON'T:

- Commit `.env.local` files to git
- Put secrets in `.env.example` files
- Use different Supabase projects per app without good reason
- Duplicate identical environment variables across apps

## Troubleshooting

### Environment variables not loading

1. **Check the `envDir` setting** in your app's `vite.config.ts`:

   ```typescript
   envDir: path.resolve(__dirname, '../..');
   ```

2. **Verify file location:**

   ```bash
   ls -la .env.local  # Should be at monorepo root
   ```

3. **Check variable prefix:**
   Only variables prefixed with `VITE_` are exposed to your React code.

4. **Restart dev server:**
   Environment variables are loaded at startup. Restart after changes:

   ```bash
   # Kill all dev servers
   pkill -f vite

   # Start again
   pnpm run dev
   ```

### Different apps need different configs

If your apps truly need different backend configurations:

1. **Keep shared vars at root** (e.g., production Supabase)
2. **Override in app-specific `.env.local`** (e.g., staging URL for one app)
3. **Document why** in the app's `env.example`

### Vercel/GitHub deployments failing

Deployment secrets are managed separately in the `secrets/` directory.

1. Check `secrets/README.md`
2. Run `./secrets/deploy-secrets-all.sh`
3. Verify secrets in Vercel dashboard and GitHub repository settings

## Related Documentation

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Turbo Environment Variables](https://turbo.build/repo/docs/core-concepts/caching#environment-variable-inputs)
- `/secrets/README.md` - Deployment secrets management
- `/docs/developer-guidelines/development-setup.md` - Initial setup guide
