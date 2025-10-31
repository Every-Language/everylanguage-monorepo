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
   ./secrets/deploy-secrets.sh
   ```

## File Structure

- `.env.shared` - Repository-level secrets (Supabase, Cloudflare, NPM, Turbo)
- `.env.development` - Development environment secrets (GitHub + Vercel preview)
- `.env.production` - Production environment secrets (GitHub + Vercel production)

## Security

⚠️ **NEVER commit the actual `.env` files** - they contain sensitive secrets!

Only `.env.*.example` files should be committed to git.

## Future Migration

This setup is designed to be easily migrated to 1Password CLI in the future. The script can be updated to pull secrets from 1Password vaults instead of local `.env` files.

