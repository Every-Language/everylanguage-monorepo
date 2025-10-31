# Monorepo Migration Guide

## ✅ Completed

- ✓ Repository structure created with `apps/` and `packages/`
- ✓ Backend, both frontends, and shared types migrated
- ✓ pnpm workspaces and Turborepo configured
- ✓ CI/CD workflows unified and updated
- ✓ Latest partnership dashboard changes synced
- ✓ Duplicate files cleaned up
- ✓ Pushed to GitHub (develop and main branches)

## 📋 Remaining Migration Tasks

### 1. GitHub Repository Settings

#### A. Update Branch Protection Rules

Navigate to: `https://github.com/Every-Language/everylanguage-monorepo/settings/branches`

**For `main` branch:**
- ☐ Enable "Require a pull request before merging"
- ☐ Enable "Require status checks to pass before merging"
  - Add required checks: `Backend Tests & Linting`, `Frontend Tests & Linting`, `Security Scan`
- ☐ Enable "Require branches to be up to date before merging"
- ☐ Enable "Require conversation resolution before merging"

**For `develop` branch:**
- ☐ Same settings as main (optional, but recommended)

#### B. Set Up GitHub Environments (RECOMMENDED)

Navigate to: `https://github.com/Every-Language/everylanguage-monorepo/settings/environments`

**Create "development" environment:**
- ☐ Click "New environment" → Name: `development`
- ☐ Add protection rules:
  - Deployment branches: `develop` only
- ☐ Add secrets (see Secret Management section below)

**Create "production" environment:**
- ☐ Click "New environment" → Name: `production`
- ☐ Add protection rules:
  - Deployment branches: `main` only
  - Required reviewers: Add yourself (optional but recommended)
- ☐ Add secrets (see Secret Management section below)

### 2. Secret Management

#### Option A: GitHub Environments (RECOMMENDED)

**Why this is better:**
- ✅ Clearer separation between dev/prod secrets
- ✅ Built-in environment protection (can require approvals for prod)
- ✅ Easier to audit which secrets are used where
- ✅ Prevents accidental use of wrong environment secrets
- ✅ Can scope different secrets per environment

**Migration steps:**

1. **Create secrets in "development" environment:**
   ```
   SUPABASE_ACCESS_TOKEN (shared)
   SUPABASE_DEV_PROJECT_REF
   SUPABASE_DEV_DB_PASSWORD
   NPM_TOKEN (shared)
   R2_ACCESS_KEY_ID (shared, or separate for dev)
   R2_SECRET_ACCESS_KEY (shared, or separate for dev)
   CLOUDFLARE_ACCOUNT_ID (shared)
   CLOUDFLARE_API_TOKEN_WORKERS (shared, or separate)
   CDN_SIGNING_SECRET (can differ per env)
   TWILIO_ACCOUNT_SID (shared)
   TWILIO_AUTH_TOKEN (shared)
   TWILIO_VERIFY_SERVICE_SID (shared)
   RESEND_API_KEY (shared)
   ```

2. **Create secrets in "production" environment:**
   ```
   SUPABASE_ACCESS_TOKEN (shared)
   SUPABASE_PROD_PROJECT_REF
   SUPABASE_PROD_DB_PASSWORD
   NPM_TOKEN (shared)
   R2_ACCESS_KEY_ID (shared, or separate for prod)
   R2_SECRET_ACCESS_KEY (shared, or separate for prod)
   CLOUDFLARE_ACCOUNT_ID (shared)
   CLOUDFLARE_API_TOKEN_WORKERS (shared, or separate)
   CDN_SIGNING_SECRET (can differ per env)
   TWILIO_ACCOUNT_SID (shared)
   TWILIO_AUTH_TOKEN (shared)
   TWILIO_VERIFY_SERVICE_SID (shared)
   RESEND_API_KEY (shared)
   ```

3. **Update workflow files to use environments:**

   In `.github/workflows/deploy-backend-dev.yml`:
   ```yaml
   jobs:
     deploy-dev:
       environment: development  # Add this line
       runs-on: ubuntu-latest
   ```

   In `.github/workflows/deploy-backend-prod.yml`:
   ```yaml
   jobs:
     deploy-production:
       environment: production  # Add this line
       runs-on: ubuntu-latest
   ```

   In `.github/workflows/publish-types-dev.yml`:
   ```yaml
   jobs:
     publish-dev:
       environment: development  # Add this line
       runs-on: ubuntu-latest
   ```

   In `.github/workflows/publish-types-prod.yml`:
   ```yaml
   jobs:
     publish-prod:
       environment: production  # Add this line
       runs-on: ubuntu-latest
   ```

#### Option B: Repository Secrets (Current Approach)

If you prefer to keep using repository secrets:
- ☐ Copy all secrets from old repos to `everylanguage-monorepo`
- ☐ Use naming convention: `DEV_*` and `PROD_*` prefixes
- ☐ Update workflow files to use the new names

**GitHub CLI Script for Secret Management:**

If you want to script this, here's an example:

```bash
#!/bin/bash
# migrate-secrets.sh

REPO="Every-Language/everylanguage-monorepo"

# Development secrets
gh secret set SUPABASE_DEV_PROJECT_REF --repo $REPO --env development
gh secret set SUPABASE_DEV_DB_PASSWORD --repo $REPO --env development
# ... repeat for all secrets

# Production secrets
gh secret set SUPABASE_PROD_PROJECT_REF --repo $REPO --env production
gh secret set SUPABASE_PROD_DB_PASSWORD --repo $REPO --env production
# ... repeat for all secrets
```

**Recommendation: Use GitHub Environments** - It's the modern approach and provides better organization and security.

### 3. Vercel Configuration

#### A. Update Project Settings

**For Web Project Dashboard:**

Navigate to: Vercel Project → Settings

1. **General → Git:**
   - ☐ Repository: Change to `Every-Language/everylanguage-monorepo`
   - ☐ Production Branch: `main`

2. **General → Build & Development Settings:**
   - ☐ Framework Preset: `Vite`
   - ☐ Root Directory: `apps/frontend/web-project-dashboard`
   - ☐ Build Command: `cd ../../.. && pnpm run build --filter=web-project-dashboard`
   - ☐ Output Directory: `dist`
   - ☐ Install Command: `pnpm install`

3. **Git → Deploy Hooks:**
   - ☐ Branch: `develop` → Preview deployments
   - ☐ Branch: `main` → Production deployments

**For Web Partnership Dashboard:**

Navigate to: Vercel Project → Settings

1. **General → Git:**
   - ☐ Repository: Change to `Every-Language/everylanguage-monorepo`
   - ☐ Production Branch: `main`

2. **General → Build & Development Settings:**
   - ☐ Framework Preset: `Vite`
   - ☐ Root Directory: `apps/frontend/web-partnership-dashboard`
   - ☐ Build Command: `cd ../../.. && pnpm run build --filter=web-partnership-dashboard`
   - ☐ Output Directory: `dist`
   - ☐ Install Command: `pnpm install`

3. **Git → Deploy Hooks:**
   - ☐ Branch: `develop` → Preview deployments
   - ☐ Branch: `main` → Production deployments

#### B. Environment Variables (No Changes Needed)

Your Vercel environment variables stay the same:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Any other frontend-specific variables

### 4. NPM Package Publishing

**No changes required** - Your type publishing workflows are already configured correctly:
- ☐ Verify you have `NPM_TOKEN` secret in GitHub
- ☐ First successful deploy will publish types automatically

### 5. Supabase Configuration

**No changes required** - Everything works the same:
- Local development: `pnpm backend:dev` (starts Supabase locally)
- Migrations: Deployed via GitHub Actions as before
- Edge Functions: Deployed via GitHub Actions as before

### 6. PowerSync Configuration

**No changes required** - PowerSync connects to your Supabase database:
- Mobile apps continue to use the same Supabase connection strings
- No configuration changes needed in PowerSync dashboard

### 7. Update Old Repositories

#### Archive Old Repos (Optional but Recommended)

Once everything is working in the monorepo:

1. **el-backend:**
   - ☐ Go to Settings → General → "Archive this repository"
   - ☐ Add note in README: "This repository has been merged into everylanguage-monorepo"

2. **omt-project-management-website:**
   - ☐ Archive and add redirect note

3. **everylanguage-map-portal:**
   - ☐ Archive and add redirect note

#### Update Links

- ☐ Update any documentation that references old repos
- ☐ Update team wikis / notion / confluence pages
- ☐ Update any external links (if applicable)

## 🧪 Testing Checklist

### Test Locally

```bash
# 1. Pull the monorepo
git clone https://github.com/Every-Language/everylanguage-monorepo.git
cd everylanguage-monorepo

# 2. Install dependencies
pnpm install

# 3. Test backend
pnpm backend:dev
pnpm backend:generate-types

# 4. Test frontend builds
pnpm --filter=web-project-dashboard build
pnpm --filter=web-partnership-dashboard build

# 5. Run tests
pnpm test

# 6. Check linting
pnpm lint
```

### Test CI/CD

1. **Create a test branch:**
   ```bash
   git checkout -b test/monorepo-ci
   echo "test" >> test.txt
   git add test.txt
   git commit -m "test: verify CI pipeline"
   git push origin test/monorepo-ci
   ```

2. **Create a PR to develop:**
   - ☐ Verify CI runs: Backend Tests, Frontend Tests, Security Scan
   - ☐ All checks should pass

3. **Merge to develop:**
   - ☐ Verify backend deployment runs
   - ☐ Verify Vercel preview deployments create
   - ☐ Verify type publishing workflow triggers

4. **Test production:**
   - ☐ Create PR from develop to main
   - ☐ Merge after approval
   - ☐ Verify production deployments

## 📊 Post-Migration Monitoring

### Week 1
- ☐ Monitor GitHub Actions for any failures
- ☐ Check Vercel deployments are successful
- ☐ Verify NPM type packages are publishing correctly
- ☐ Test local development workflow with team

### Week 2-4
- ☐ Ensure all team members can work in monorepo
- ☐ Monitor build times (should be faster with Turborepo caching)
- ☐ Archive old repositories once confident

## 🚨 Rollback Plan

If something goes wrong:

1. **Old repos still exist** - Can revert to using them
2. **Git history preserved** - Can cherry-pick commits if needed
3. **Vercel can point back** - Just change repository in settings
4. **No data loss** - All Supabase data untouched

## 📞 Support

If you encounter issues:
1. Check GitHub Actions logs
2. Check Vercel deployment logs
3. Verify secrets are set correctly
4. Ensure pnpm is installed locally

