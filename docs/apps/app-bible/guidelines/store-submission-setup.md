# Store Submission Setup Guide

## Prerequisites

- EAS CLI installed and authenticated
- Apple Developer account (for iOS)
- Google Play Console account (for Android)
- App already created in both stores

## iOS Setup (TestFlight & App Store)

### 1. Apple Developer Account Setup

1. **Create App in App Store Connect**:
   - Go to https://appstoreconnect.apple.com
   - Create new app with bundle ID: `com.everylanguage.elbible`
   - Note down the App Store Connect app ID

2. **Generate App Store Connect API Key**:
   - Go to Users and Access → Keys
   - Create new API key with "App Manager" role
   - Download the `.p8` file
   - Note the Key ID and Issuer ID

### 2. Configure EAS Credentials

```bash
# Run EAS credentials configuration
npx eas credentials

# Choose iOS → Production
# Upload your App Store Connect API key
# Configure app identifier and team
```

### 3. Update eas.json (Already Configured)

Your `eas.json` already has the correct iOS configuration:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "dev@everysevennine.tech",
      "ascAppId": "6747809320"
    }
  }
}
```

## Android Setup (Google Play)

### 1. Google Play Console Setup

1. **Create App in Play Console**:
   - Go to https://play.google.com/console
   - Create new app with package name: `com.everylanguage.elbible`

2. **Enable Google Play Console API**:
   - Go to Google Cloud Console
   - Enable "Google Play Android Developer API"

3. **Create Service Account**:
   - In Google Cloud Console → IAM & Admin → Service Accounts
   - Create new service account
   - Download JSON key file

4. **Grant Permissions**:
   - In Play Console → Setup → API access
   - Link the service account
   - Grant "Admin (all permissions)" access

### 2. Configure EAS Credentials

```bash
# Upload service account key
npx eas credentials

# Choose Android → Production
# Upload the JSON service account key file
```

### 3. Update eas.json

Update the Android section in `eas.json`:

```json
"android": {
  "serviceAccountKeyPath": "./path/to/your-service-account-key.json",
  "track": "internal"  # or "alpha", "beta", "production"
}
```

## Automatic Submission Workflow

### How It Works

1. **Push to main** → Triggers production workflow
2. **Production builds** complete on EAS
3. **Store submission** happens automatically (if enabled)
4. **Notification** sent to team

### Manual Submission

You can also trigger submission manually:

```bash
# Build and submit iOS
npm run build:prod
npx eas submit --platform ios --profile production

# Build and submit Android
npm run build:prod
npx eas submit --platform android --profile production
```

### Workflow Configuration

Your production workflow (`cd-production.yml`) includes automatic submission:

```yaml
# Automatic submission happens when:
# 1. Push to main branch (always)
# 2. Manual trigger with submit_to_stores=true
```

## Distribution Tracks

### iOS Tracks

- **TestFlight**: Automatic for all production builds
- **App Store**: Requires manual approval in App Store Connect

### Android Tracks

- **Internal**: Automatic (configured in eas.json)
- **Alpha/Beta**: Configure track in eas.json
- **Production**: Requires manual approval in Play Console

## Monitoring & Notifications

### Build Status

- Check build status: https://expo.dev/@every-language/el-bible
- GitHub Actions will notify on build completion
- EAS CLI: `npx eas build:list`

### Submission Status

- iOS: Check App Store Connect for TestFlight status
- Android: Check Play Console for track status
- EAS CLI: `npx eas submit:list`

## Troubleshooting

### Common Issues

**iOS Submission Failures**:

```bash
# Check credentials
npx eas credentials --platform ios

# Re-upload API key if expired
npx eas credentials --platform ios --reset
```

**Android Submission Failures**:

```bash
# Check service account key
npx eas credentials --platform android

# Verify Play Console API is enabled
# Check service account permissions
```

### Error Messages

- **"Invalid App Store Connect API key"**: Re-upload the API key
- **"Service account not found"**: Check Google Cloud Console setup
- **"App not found"**: Verify app exists in respective store
- **"Invalid bundle identifier"**: Check app.json configuration

## Security Best Practices

1. **Store credentials securely**: EAS handles credential storage
2. **Use service accounts**: Don't use personal Google accounts
3. **Rotate API keys**: Regularly update App Store Connect API keys
4. **Monitor access**: Check who has access to store accounts
5. **Use least privilege**: Grant minimum required permissions

## Testing Submission

### Test with Internal Distribution

Before production, test submission with internal tracks:

```bash
# iOS TestFlight internal testing
npx eas submit --platform ios --profile production

# Android internal testing
npx eas submit --platform android --profile production
```

### Verify Submissions

1. **iOS**: Check TestFlight in App Store Connect
2. **Android**: Check Internal Testing in Play Console
3. **Install and test**: Download from respective platforms

## OTA Updates

**Important**: OTA (Over-The-Air) updates work independently of store submission:

```bash
# Deploy JavaScript updates instantly
npm run update:prod

# No store approval needed for JS-only changes
# Native changes require new store submission
```

## Next Steps

1. **Configure credentials** for both platforms
2. **Test submission** with internal tracks
3. **Push to main** to trigger automatic production builds
4. **Monitor build status** in Expo dashboard
5. **Approve releases** in respective store consoles
