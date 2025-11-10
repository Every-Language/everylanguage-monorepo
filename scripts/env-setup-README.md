# Environment Setup Scripts

## migrate-env-to-root.sh

This script helps migrate from per-app `.env.local` files to a centralized root `.env.local` file.

### Usage

```bash
./scripts/migrate-env-to-root.sh
```

### What it does

1. Checks if root `.env.local` already exists
2. Finds your existing app `.env.local` files
3. Copies one to the repository root
4. Verifies all app files are identical
5. Offers to delete duplicate app-level files
6. Provides next steps and verification instructions

### Prerequisites

You should have at least one existing `.env.local` file in one of the apps:

- `apps/web-project-dashboard/.env.local`
- `apps/web-partnership-dashboard/.env.local`
- `apps/web-admin-dashboard/.env.local`

### Manual Alternative

If you prefer to migrate manually:

1. Copy any app's `.env.local` to the root:

   ```bash
   cp apps/web-project-dashboard/.env.local .env.local
   ```

2. Test that everything works:

   ```bash
   pnpm run dev
   ```

3. Remove duplicate app files:
   ```bash
   rm apps/*/. env.local
   ```

## Creating .env.local from scratch

If you don't have any existing `.env.local` files, create a root `.env.example` file first:

```bash
cat > .env.example << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Stripe
# VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Optional: Maps
# VITE_MAPTILER_KEY=your_key
# VITE_MAP_STYLE_URL=your_style_url
EOF
```

Then copy and fill in your values:

```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

## Related Documentation

- [Environment Variables Guide](../docs/developer-guidelines/environment-variables-guide.md) - Complete guide to the environment system
- [Migration Steps](../docs/developer-guidelines/environment-migration-steps.md) - Step-by-step migration instructions
- [Development Setup](../docs/developer-guidelines/development-setup.md) - Initial setup for new developers
