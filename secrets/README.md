# Secret Management

This directory contains template files for managing secrets across GitHub and Vercel.

## Setup

1. **Copy the example files:**

   ```bash
   cp .env.shared.example .env.shared
   cp .env.development.example .env.development
   cp .env.production.example .env.production
   ```

2. **Fill in your secrets** in the three `.env` files

3. **Get Turborepo tokens:**

   ```bash
   # Login to Turbo (if not already done)
   turbo login

   # Link to your Vercel team
   turbo link

   # Generate a token at: https://vercel.com/account/tokens
   # Add it to .env.shared as TURBO_TOKEN

   # Get your team slug
   vercel teams ls
   # Add it to .env.shared as TURBO_TEAM
   ```

4. **Deploy secrets:**

   ```bash
   # Deploy to all platforms (GitHub, Vercel, Supabase)
   ./secrets/deploy-secrets.sh

   # Or deploy to individual platforms:
   ./secrets/deploy-github-secrets.sh   # GitHub Actions only
   ./secrets/deploy-vercel-secrets.sh   # Vercel only
   ./secrets/deploy-supabase-secrets.sh # Supabase Edge Functions only
   ```

## File Structure

### Environment Files

- `.env.shared` - Repository-level secrets (Supabase, Cloudflare, NPM, Turbo, IP Geo, HubSpot, and shared Vercel `VITE_*` variables)
- `.env.development` - Development environment secrets (GitHub + Vercel preview + Supabase Edge Functions)
- `.env.production` - Production environment secrets (GitHub + Vercel production + Supabase Edge Functions)

**Important:** Store base variables (e.g., `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `POWERSYNC_URL`) in these files. The deployment scripts automatically derive framework-specific variables (`VITE_*`, `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`) from these base values.

### Deployment Scripts

- `deploy-secrets.sh` - **Master script** that deploys to all platforms
- `deploy-github-secrets.sh` - Deploys secrets to GitHub Actions (repository + environments)
- `deploy-vercel-secrets.sh` - Deploys secrets to Vercel projects (preview + production)
- `deploy-supabase-secrets.sh` - Deploys secrets to Supabase Edge Functions
- `common.sh` - Shared utilities and functions (sourced by other scripts)

## Deployment Targets

The deployment script automatically deploys secrets to:

1. **GitHub Actions** (repository-level and environment secrets)
2. **Vercel** (preview and production environments for all three frontend projects)
3. **Supabase Edge Functions** (development and production projects)

### Vercel Secrets

The following secrets are deployed to Vercel projects (both preview and production):

**From `.env.shared`:**

- Any `VITE_*` variables (shared across both environments, deployed to all three projects: project dashboard, partnership dashboard, and admin dashboard)
- Any `NEXT_PUBLIC_*` variables (Next.js client-side, deployed to partnership dashboard only)
- `JOSHUA_PROJECT_API_KEY` (Next.js server-side, deployed to partnership dashboard only)

**From `.env.development` (Preview Environment):**

**Base Variables (store these):**

- `SUPABASE_PROJECT_ID` or `SUPABASE_URL` (URL derived from PROJECT_ID if not set)
- `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY` (ANON_KEY preferred)
- `POWERSYNC_BIBLE_URL` (for app-bible - instance-specific URL)
- `POWERSYNC_RECORD_URL` (for app-record - instance-specific URL)
- `STRIPE_PUBLISHABLE_KEY`

**Derived Variables (automatically created):**

- `VITE_SUPABASE_URL` → from `SUPABASE_URL` or `SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` → from `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` → from `SUPABASE_URL` or `SUPABASE_PROJECT_ID`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → from `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL` → from `SUPABASE_URL` or `SUPABASE_PROJECT_ID` (GitHub only)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` → from `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY` (GitHub only)
- `EXPO_PUBLIC_POWERSYNC_BIBLE_URL` → from `POWERSYNC_BIBLE_URL` (GitHub only)
- `EXPO_PUBLIC_POWERSYNC_RECORD_URL` → from `POWERSYNC_RECORD_URL` (GitHub only)
- `VITE_STRIPE_PUBLISHABLE_KEY` → from `STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → from `STRIPE_PUBLISHABLE_KEY`

**From `.env.production` (Production Environment):**

Same derivation pattern as development, but using production values.

**Note:**

- Secrets from `.env.shared` are deployed to both preview and production environments, making them ideal for shared configuration values.
- `VITE_*` variables are for Vite-based apps (project dashboard and admin dashboard)
- `NEXT_PUBLIC_*` variables are for Next.js client-side (partnership dashboard)
- Server-side Next.js variables (like `JOSHUA_PROJECT_API_KEY`) don't need a prefix and are deployed to the partnership dashboard only

### GitHub Actions Secrets

The following secrets are deployed to GitHub Actions environments:

**From `.env.shared` (Repository-level):**

- All non-Vercel secrets (Supabase access tokens, Cloudflare, Turbo, etc.)

**From `.env.development` (Development Environment):**

- Base variables: `SUPABASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `POWERSYNC_BIBLE_URL`, `POWERSYNC_RECORD_URL`, etc.
- **Derived variables (automatically created):**
  - `EXPO_PUBLIC_SUPABASE_URL` → from `SUPABASE_URL` or `SUPABASE_PROJECT_ID`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` → from `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`
  - `EXPO_PUBLIC_POWERSYNC_BIBLE_URL` → from `POWERSYNC_BIBLE_URL`
  - `EXPO_PUBLIC_POWERSYNC_RECORD_URL` → from `POWERSYNC_RECORD_URL`

**From `.env.production` (Production Environment):**

- Same base variables as development, but with production values
- Same derivation pattern for `EXPO_PUBLIC_*` variables

**Note:** `VITE_*` and `NEXT_PUBLIC_*` variables are skipped for GitHub (they're Vercel-specific).

### Supabase Edge Function Secrets

The following secrets are deployed to Supabase Edge Functions:

**From `.env.shared`:**

- R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (for R2 storage)
- CDN_SIGNING_SECRET, CDN_BASE_URL (for CDN signed URLs)
- IP_GEO_PROVIDER, IP_GEO_API_KEY (for analytics geolocation)
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID (for SMS auth)
- RESEND_API_KEY (for email auth via SMTP)
- JOSHUA_PROJECT_API_KEY (for Joshua Project API integration)
- HUBSPOT_PRIVATE_APP_TOKEN (optional, for CRM integration)

**From `.env.development` / `.env.production`:**

- ENV (environment identifier)
- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL
- R2_BUCKET_NAME (environment-specific)
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (environment-specific)

## Security

⚠️ **NEVER commit the actual `.env` files** - they contain sensitive secrets!

Only `.env.*.example` files should be committed to git.

## Future Migration

This setup is designed to be easily migrated to 1Password CLI in the future. The script can be updated to pull secrets from 1Password vaults instead of local `.env` files.
