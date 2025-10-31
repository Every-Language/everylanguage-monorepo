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
- `.env.shared` - Repository-level secrets (Supabase, Cloudflare, NPM, Turbo, IP Geo, HubSpot)
- `.env.development` - Development environment secrets (GitHub + Vercel preview + Supabase Edge Functions)
- `.env.production` - Production environment secrets (GitHub + Vercel production + Supabase Edge Functions)

### Deployment Scripts
- `deploy-secrets.sh` - **Master script** that deploys to all platforms
- `deploy-github-secrets.sh` - Deploys secrets to GitHub Actions (repository + environments)
- `deploy-vercel-secrets.sh` - Deploys secrets to Vercel projects (preview + production)
- `deploy-supabase-secrets.sh` - Deploys secrets to Supabase Edge Functions
- `common.sh` - Shared utilities and functions (sourced by other scripts)

## Deployment Targets

The deployment script automatically deploys secrets to:

1. **GitHub Actions** (repository-level and environment secrets)
2. **Vercel** (preview and production environments for both frontend projects)
3. **Supabase Edge Functions** (development and production projects)

### Supabase Edge Function Secrets

The following secrets are deployed to Supabase Edge Functions:

**From `.env.shared`:**
- R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (for R2 storage)
- CDN_SIGNING_SECRET, CDN_BASE_URL (for CDN signed URLs)
- IP_GEO_PROVIDER, IP_GEO_API_KEY (for analytics geolocation)
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID (for SMS auth)
- RESEND_API_KEY (for email auth via SMTP)
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

