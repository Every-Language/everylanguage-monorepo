# Environment Variables Migration Guide

## Quick Migration Steps

Follow these steps to migrate from per-app `.env.local` files to the new centralized structure.

### Step 1: Create Root .env.local

Copy your existing environment variables to the monorepo root:

```bash
# From the monorepo root
cp apps/web-project-dashboard/.env.local .env.local
```

### Step 2: Verify All Apps Use Same Config

Check if all your app `.env.local` files are identical:

```bash
diff apps/web-project-dashboard/.env.local apps/web-partnership-dashboard/.env.local
diff apps/web-project-dashboard/.env.local apps/web-admin-dashboard/.env.local
```

If they're identical, continue to Step 3. If they differ, see "Handling Different Configs" below.

### Step 3: Remove App-Level .env.local Files (Optional)

Since all apps now load from the root, you can remove the duplicate files:

```bash
rm apps/web-project-dashboard/.env.local
rm apps/web-partnership-dashboard/.env.local
rm apps/web-admin-dashboard/.env.local
```

**Note:** This step is optional. If you keep the app-level files, they'll override the root values (which you probably don't want).

### Step 4: Test

Start all dev servers and verify everything works:

```bash
pnpm run dev
```

Check that:

- All three dashboards start successfully
- Supabase connections work
- No console errors about missing environment variables

### Step 5: Update .gitignore (Already Done)

The `.gitignore` already excludes `.env.local` files at all levels, so you're covered.

## Alternative: Use the Migration Script

We've provided a script that automates this process:

```bash
./scripts/migrate-env-to-root.sh
```

The script will:

1. Check if root `.env.local` exists
2. Find your existing app `.env.local` files
3. Copy one to the root
4. Verify all app files are identical
5. Offer to delete duplicate app files
6. Provide next steps

## Handling Different Configs

If your app `.env.local` files have **different** values, you have two options:

### Option A: Consolidate to Root (Recommended)

If the differences were accidental or no longer needed:

1. Manually review the differences
2. Pick the correct values
3. Put them all in the root `.env.local`
4. Delete the app-level files

### Option B: Keep App-Specific Overrides

If certain apps genuinely need different configs:

1. Put **shared** values in root `.env.local`
2. Keep **app-specific** overrides in `apps/*/. env.local`
3. Document why in the app's `env.example` file

Example root `.env.local`:

```bash
# Shared production Supabase
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod_key_here
```

Example `apps/web-project-dashboard/.env.local`:

```bash
# Override for testing new features
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_ENABLE_PROJECT_BETA_FEATURE=true
```

## Rollback

If something goes wrong, you can easily rollback:

1. Restore your app-level `.env.local` files from a backup
2. Remove the `envDir` line from each `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  // Remove this line:
  // envDir: path.resolve(__dirname, '../..'),
  // ... rest of config
});
```

3. Restart your dev servers

## Verification Checklist

After migration, verify:

- [ ] Root `.env.local` exists with correct values
- [ ] All three apps start with `pnpm run dev`
- [ ] Supabase authentication works
- [ ] No duplicate app-level `.env.local` files (unless intentional)
- [ ] All environment variables are accessible in your React code
- [ ] No console warnings about missing environment variables

## Getting Help

If you encounter issues:

1. Check the [Environment Variables Guide](./environment-variables-guide.md)
2. Verify your `vite.config.ts` includes the `envDir` setting
3. Restart your dev servers (environment vars load at startup)
4. Check for typos in variable names (must start with `VITE_`)

## Next Steps

After successful migration:

1. Read the full [Environment Variables Guide](./environment-variables-guide.md)
2. Update any team documentation about local setup
3. Let team members know about the new structure
4. Consider updating your onboarding docs

## Deployment Notes

**Important:** This migration only affects **local development**. Your deployment configs in `secrets/` and Vercel/GitHub remain unchanged and continue to work exactly as before.
