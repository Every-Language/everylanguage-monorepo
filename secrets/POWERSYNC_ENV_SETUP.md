# PowerSync Environment Variables Setup

## Overview

Each PowerSync project has its own instance-specific URLs. Since we have separate projects for `app-bible` and `app-record`, each with dev and prod instances, we need app-specific PowerSync URLs.

## Required Environment Variables

### `.env.development` (Development Environment)

Add PowerSync URLs for development instances:

```bash
# PowerSync - Instance URLs for Development
POWERSYNC_BIBLE_URL=https://your-bible-dev-instance-id.powersync.journeyapps.com
POWERSYNC_RECORD_URL=https://your-record-dev-instance-id.powersync.journeyapps.com
```

### `.env.production` (Production Environment)

Add PowerSync URLs for production instances:

```bash
# PowerSync - Instance URLs for Production
POWERSYNC_BIBLE_URL=https://your-bible-prod-instance-id.powersync.journeyapps.com
POWERSYNC_RECORD_URL=https://your-record-prod-instance-id.powersync.journeyapps.com
```

**Note**: These URLs are different from development URLs.

## How to Get PowerSync URLs

1. **POWERSYNC_BIBLE_URL (dev)**:
   - Go to PowerSync Dashboard → Bible project → Instances
   - Select the Development instance
   - Copy the instance URL (format: `https://<instance-id>.powersync.journeyapps.com`)

2. **POWERSYNC_BIBLE_URL (prod)**:
   - Go to PowerSync Dashboard → Bible project → Instances
   - Select the Production instance
   - Copy the instance URL

3. **POWERSYNC_RECORD_URL (dev)**:
   - Go to PowerSync Dashboard → Record project → Instances
   - Select the Development instance
   - Copy the instance URL

4. **POWERSYNC_RECORD_URL (prod)**:
   - Go to PowerSync Dashboard → Record project → Instances
   - Select the Production instance
   - Copy the instance URL

## How URLs Are Used

### GitHub Actions Workflows

The deployment script automatically creates:

- `EXPO_PUBLIC_POWERSYNC_BIBLE_URL` (from `POWERSYNC_BIBLE_URL`)
- `EXPO_PUBLIC_POWERSYNC_RECORD_URL` (from `POWERSYNC_RECORD_URL`)

These are deployed as environment-specific secrets (development/production).

### App Configuration

- **app-bible**: Uses `EXPO_PUBLIC_POWERSYNC_BIBLE_URL` → `POWERSYNC_BIBLE_URL`
- **app-record**: Uses `EXPO_PUBLIC_POWERSYNC_RECORD_URL` → `POWERSYNC_RECORD_URL`

**Note**: Each app uses its own app-specific URL variable. There is no generic `POWERSYNC_URL` since we have separate projects for each app.

## Example .env.development

```bash
# PowerSync - Instance URLs for Development
POWERSYNC_BIBLE_URL=https://688f10841b4862186551cbbe.powersync.journeyapps.com
POWERSYNC_RECORD_URL=https://your-record-dev-instance-id.powersync.journeyapps.com
```

## Example .env.production

```bash
# PowerSync - Instance URLs for Production
POWERSYNC_BIBLE_URL=https://688f1d649f644bd691508926.powersync.journeyapps.com
POWERSYNC_RECORD_URL=https://your-record-prod-instance-id.powersync.journeyapps.com
```

## Deploying Secrets

After adding the URLs to your `.env` files, deploy them:

```bash
./secrets/deploy-github-secrets.sh
```

This will create:

- `EXPO_PUBLIC_POWERSYNC_BIBLE_URL` in development and production environments
- `EXPO_PUBLIC_POWERSYNC_RECORD_URL` in development and production environments
