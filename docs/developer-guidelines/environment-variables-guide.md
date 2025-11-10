# Environment Variables Guide

This guide explains how environment variables are managed across the monorepo.

## Overview

The monorepo uses a **two-tier environment variable system**:

1. **App-specific variables** (`.env.local` in each app) - For local development
2. **Deployment secrets** (`secrets/` directory) - For CI/CD and production

## Directory Structure

```
/monorepo-root/
  apps/
    web-project-dashboard/
      .env.local          # App-specific environment variables
      env.example         # Template for app-specific vars
    web-partnership-dashboard/
    web-admin-dashboard/
      .env.local          # App-specific environment variables
      env.example         # Template for app-specific vars

  secrets/                # Deployment-time secrets
    .env.development      # Dev deployment (Vercel preview, GitHub Actions)
    .env.production       # Prod deployment (Vercel production)
    .env.shared           # Shared across environments
```

## 1. App-Specific Environment Variables (Local Development)

**Location:** `/apps/<app-name>/.env.local` (gitignored)

**Purpose:** Environment variables for local development. Each app loads its own `.env.local` file.

**Contains:**

- Supabase URL and keys
- Stripe publishable keys
- Map provider keys
- App-specific API endpoints
- App-specific feature flags

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

# App-specific feature flags
VITE_ENABLE_BETA_FEATURE=true
```

### How It Works

Each app's `vite.config.ts` uses Vite's default behavior, which loads `.env` files from the app's directory:

```typescript
export default defineConfig({
  // No envDir specified - defaults to app directory
  // ... other config
});
```

This tells Vite to look for `.env` files in the app's own directory.

## 2. Deployment Secrets

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

1. **Copy the app's environment example:**

   ```bash
   # For admin dashboard
   cd apps/web-admin-dashboard
   cp env.example .env.local

   # For project dashboard
   cd apps/web-project-dashboard
   cp env.example .env.local
   ```

2. **Fill in your values:**
   - Get Supabase URL and anon key from your team
   - Add any optional keys you need (Stripe, Maps, etc.)

3. **Test that it works:**
   ```bash
   pnpm run dev
   ```
   All dashboards should start and connect to Supabase.

### For Existing Developers (Migration)

If you currently have a root `.env.local` file:

1. **Copy to each app directory:**

   ```bash
   # Copy root .env.local to each app
   cp .env.local apps/web-admin-dashboard/.env.local
   cp .env.local apps/web-project-dashboard/.env.local
   ```

2. **Remove root `.env.local` (optional):**

   ```bash
   # Root .env.local is no longer used by these apps
   rm .env.local
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

Each app loads these files from its own directory.

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

- Use app-specific `.env.local` files for each app
- Prefix all Vite env vars with `VITE_`
- Use `env.example` files to document required variables
- Add new build-affecting vars to `turbo.json` `globalEnv`
- Share common values across apps by copying (or use a script if needed)

### ❌ DON'T:

- Commit `.env.local` files to git
- Put secrets in `env.example` files
- Rely on a root `.env.local` file (apps don't read from root anymore)

## Troubleshooting

### Environment variables not loading

1. **Check that `envDir` is not set** in your app's `vite.config.ts` (defaults to app directory):

   ```typescript
   // Should NOT have this line:
   // envDir: path.resolve(__dirname, '../..'),
   ```

2. **Verify file location:**

   ```bash
   ls -la apps/web-admin-dashboard/.env.local  # Should be in app directory
   ls -la apps/web-project-dashboard/.env.local  # Should be in app directory
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

Each app now has its own `.env.local` file, so you can easily configure them differently:

1. **Set different values in each app's `.env.local`**
2. **Document differences** in the app's `env.example` if needed

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
