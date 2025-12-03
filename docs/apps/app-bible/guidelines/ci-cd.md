# CI/CD Pipeline & Testing Strategy

## CI/CD Architecture

### GitHub Actions Workflow Structure

```
.github/workflows/
├── ci.yml                    # Main CI pipeline (PR checks)
├── cd-app-bible-production.yml  # Production deployment with store submission
└── deploy-powersync-app-bible.yml  # PowerSync sync rules deployment
```

### Branch Strategy

- **main**: Production-ready code, protected branch → Auto-deploys to production
- **develop**: Integration branch for features → CI checks only
- **feature/\***: Feature development branches
- **hotfix/\***: Emergency production fixes

## Expo Managed Workflow Architecture

### Build System

- **EAS Build**: All builds happen on Expo's cloud servers
- **No native folders**: `android/` and `ios/` folders removed
- **Universal development**: Works on any machine without native toolchains
- **Consistent builds**: Same environment for all developers

### Development vs Production

- **Development**: `npm start` with Expo Go for instant testing
- **Builds**: `npm run build:*` creates installable apps via EAS
- **OTA Updates**: Instant JavaScript updates without app store approval

## CI Pipeline (ci.yml)

### Trigger Conditions

```yaml
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]
```

### Pipeline Stages

#### 1. Code Quality & Tests (Combined)

- ESLint for code style
- Prettier for formatting
- TypeScript compilation
- Jest test execution with coverage

#### 2. Expo Managed Workflow Validation

- EAS CLI setup and authentication
- `expo-doctor` validation
- Managed workflow compliance check
- Configuration validation

### Quality Gates

- All linting and formatting checks pass
- Test coverage threshold met (80%)
- TypeScript compilation successful
- Expo configuration valid
- No native folders present

## CD Pipeline - Production (cd-app-bible-production.yml)

### Trigger Conditions

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

### Pipeline Stages

#### 1. Production Builds

- EAS Build for store distribution
- Code signing handled by EAS
- Production-optimized builds

#### 2. Store Submission (Optional)

- Automatic TestFlight submission (iOS)
- Google Play Internal Testing (Android)
- Manual approval for production release

#### 3. OTA Update Deployment

- Deploy JavaScript updates instantly
- No app store approval needed for JS changes
- Immediate rollback capability

#### 4. Monitoring

- Build success/failure notifications
- Store submission status
- OTA update deployment confirmation

## Environment Configuration

### Development Environment

- **Expo Go app**: For immediate testing
- **Development builds**: For testing native functionality
- **Local database**: SQLite for offline testing
- **Mock services**: For API testing

### Production Environment

- **App Store/Google Play**: Public distribution
- **Production database**: Live user data
- **Full monitoring**: Error tracking and analytics
- **OTA capabilities**: Instant updates

## Quality Gates

### Pull Request Requirements

- All CI checks pass (linting, tests, TypeScript)
- Expo configuration validation passes
- Code review approval (minimum 1 reviewer)
- No security vulnerabilities
- Test coverage threshold met (80%)

### Deployment Requirements

- All tests passing
- Managed workflow validation passes
- EAS authentication configured
- Store credentials configured (for submissions)
- Manual QA sign-off for major releases

## Developer Workflow

### Local Development

```bash
# Start development server
npm start                    # Standard mode
npm run start:tunnel        # For restricted networks

# Test on device
# Scan QR code with Expo Go app
```

### Building & Testing

```bash
# Development builds (EAS cloud)
npm run build:dev          # Both platforms
npm run build:dev:ios      # iOS only
npm run build:dev:android  # Android only

# Check configuration
npm run doctor             # Run expo-doctor
npm run verify            # Verify managed workflow setup
```

### Release Process

1. Develop features on feature branches
2. Merge to `develop` → CI checks run
3. Merge to `main` → Automatic production builds
4. Optional: Automatic store submission
5. OTA updates deployed immediately

## EAS Build Profiles

### Development Profile

- **Purpose**: Testing on real devices
- **Distribution**: Internal only
- **Features**: Debug mode, development servers
- **Build Time**: ~5-10 minutes

### Production Profile

- **Purpose**: App store distribution
- **Distribution**: Public app stores
- **Features**: Fully optimized, production APIs
- **Build Time**: ~15-20 minutes

## Troubleshooting

### Common Issues

- **EAS authentication expired**: Run `npx eas login`
- **Native folders present**: Delete `android/` and `ios/` folders
- **Build failures**: Check `expo-doctor` output
- **Store submission issues**: Verify credentials with `npx eas credentials`

### Network Issues

- **Restricted networks**: Use `npm run start:tunnel`
- **Firewall blocking**: EAS builds work regardless of local network
- **VPN interference**: EAS cloud builds bypass local network issues
