# Every Language Bible App

A React Native mobile application providing offline-first access to multilingual audio Bible content, designed to make Scripture accessible across language barriers worldwide.

## 🌟 Features

- **Offline-First Architecture**: Full functionality without internet connectivity
- **Multilingual Support**: Audio Bible content in multiple languages
- **Real-time Sync**: Seamless data synchronization when online
- **Audio Playback**: High-quality audio with background playback support
- **Search & Discovery**: Find verses, chapters, and content across languages
- **Bookmarks & Favorites**: Save and organize important passages
- **Content Sharing**: Share verses and audio with deep linking
- **Cross-platform**: Native iOS and Android applications
- **Accessibility**: Full screen reader and accessibility support

## 🏗️ Architecture

This project uses a **feature-first architecture** with offline-first design principles:

- **Frontend**: React Native with New Architecture (Fabric + TurboModules)
- **Database**: SQLite with Drizzle ORM for local storage
- **Backend**: Supabase (PostgreSQL + Authentication)
- **File Storage**: Backblaze B2 for audio file delivery
- **State Management**: Zustand + TanStack Query
- **UI Framework**: Tamagui for consistent design system

## 🛠️ Tech Stack

### Core Framework

- **React Native**
- **Expo** (custom development builds)
- **TypeScript** (Strict mode enabled)

### Data & Backend

- **SQLite** + **Drizzle ORM** (Local database)
- **Supabase** (Authentication & PostgreSQL)
- **Backblaze B2** (File storage & CDN)

### State & UI

- **Zustand** (Global state management)
- **TanStack Query** (Server state management)
- **Tamagui** (UI components & styling)
- **React Navigation** (Navigation)

### Media & Features

- **Expo Audio** (Audio playback)
- **i18next** (Internationalization)
- **Expo Notifications** (Push notifications)

### Development & Quality

- **ESLint** + **Prettier** (Code quality)
- **Jest** + **React Native Testing Library** (Unit testing)
- **Detox** (E2E testing)
- **Husky** (Git hooks)

### Analytics & Monitoring

- **PostHog** (Analytics & feature flags)
- **Sentry** (Error monitoring)

## 📋 Prerequisites

### Required Accounts & Services

- [GitHub Account](https://github.com) - Code repository
- [Expo Account](https://expo.dev) - Builds and OTA updates
- [Apple Developer Account](https://developer.apple.com) - iOS deployment ($99/year)
- [Google Play Console](https://play.google.com/console) - Android deployment ($25 one-time)
- [Supabase Account](https://supabase.com) - Backend services
- [Backblaze Account](https://www.backblaze.com) - File storage

### Development Environment

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **npm** v10+ or **yarn** v1.22+
- **Git** ([Download](https://git-scm.com/))
- **Expo CLI** v6+ (`npm install -g @expo/cli`)
- **EAS CLI** for builds (`npm install -g eas-cli`)
- **Xcode** 15+ (macOS only, for iOS simulator) - optional, only for local builds
- **Android Studio** with Android SDK (for Android emulator) - optional, only for local builds

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Every-Language/everylanguage-bible.git
cd everylanguage-bible
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

### 4. Login to Expo

```bash
npx expo login
```

### 6. Start Development Server

```bash
npx expo start
```

## 📁 Project Structure

```
src/
├── app/                    # App-level configuration
│   ├── navigation/         # Navigation setup and routing
│   ├── providers/         # Top-level providers (auth, theme, query)
│   └── config/            # App configuration and constants
├── features/              # Feature modules (domain-driven)
│   ├── auth/              # Authentication
│   ├── bible/             # Bible reading
│   ├── audio/             # Audio playback
│   ├── search/            # Search functionality
│   ├── bookmarks/         # Bookmarks and favorites
│   ├── settings/          # App settings
│   ├── sync/              # Data synchronization
│   └── sharing/           # Content sharing
└── shared/                # Shared utilities and components
    ├── components/        # Reusable UI components
    ├── hooks/             # Custom hooks
    ├── services/          # API and service integrations
    ├── utils/             # Utility functions
    ├── types/             # TypeScript type definitions
    └── constants/         # App-wide constants
```

## 🧪 Testing

### Run Unit Tests

```bash
npm test
# or
yarn test
```

### Run E2E Tests

```bash
npm run test:e2e
# or
yarn test:e2e
```

### Test Coverage

```bash
npm run test:coverage
# or
yarn test:coverage
```

## 🔧 Development Workflow

### Code Quality

This project uses automated code quality tools:

- **ESLint** - Linting and code standards
- **Prettier** - Code formatting
- **Husky** - Pre-commit hooks

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### PowerSync Schema Management

The app uses PowerSync for real-time data synchronization. When modifying sync rules:

```bash
# Generate schema from sync rules
npm run powersync:generate-schema

# Verify schema consistency
npm run powersync:verify-schema
```

> **📖 See [PowerSync Schema Management Guide](docs/powersync-schema-management.md) for detailed documentation**

### Git Workflow

1. Create feature branch from `develop`
2. Make changes with tests
3. Commit using conventional commit messages
4. Push and create pull request
5. Merge after code review and CI passes

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature development
- `hotfix/*` - Emergency fixes

### Expo Development Workflow

This project uses Expo with custom development builds:

1. **Development**: Use `npx expo start` for hot reloading
2. **Native Changes**: When adding native modules, rebuild with `eas build --profile development`
3. **Testing**: Use development builds for comprehensive testing
4. **Updates**: Push JavaScript-only updates via EAS Update for instant deployment
5. **Builds**: All builds handled by EAS Build service in the cloud

## 🚢 Deployment

### CI/CD Pipeline

This project uses GitHub Actions with EAS Build for automated deployments:

- **Pull Requests**: Automated testing
- **Develop Branch**: Development builds for local testing
- **Main Branch**: Production builds and app store submission
- **Release Tags**: Automated versioning and release notes

### Build Profiles

The project uses two build profiles defined in `eas.json`:

- **development**: For local testing with debugging enabled
- **production**: For app store releases with optimizations enabled

## 📊 Monitoring & Analytics

- **Error Monitoring**: Sentry dashboard for crash reports and performance
- **Analytics**: PostHog for user behavior and feature usage
- **Performance**: Custom metrics for audio playback and sync performance

### Code Style

- Follow existing code patterns and conventions
- Ensure all tests pass
- Maintain test coverage above 80%
- Update documentation for new features
- Use TypeScript strictly

### Logging Guidelines

This project uses a centralized logging system with file-level control for easy management:

#### Basic Usage

Each file that uses logging should have a constant at the top to control logging for that module:

```typescript
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

// Usage in your code
logger.info(ENABLE_LOGGING, 'This is an info message');
logger.error(ENABLE_LOGGING, 'This is an error message', error);
```

#### Logging Control Options

**File-level Control (Recommended)**

- Set `ENABLE_LOGGING = false` to disable all logging for that specific file
- Set `ENABLE_LOGGING = true` to enable logging for that file
- Easy to manage and provides granular control

**Feature-based Control (Advanced)**
For more sophisticated logging management, you can create feature-based constants:

```typescript
// In a shared constants file
export const LOGGING_CONFIG = {
  media: true,
  downloads: false,
  auth: true,
  // etc.
};

// In your files
import { LOGGING_CONFIG } from '@/shared/constants/logging';
logger.info(LOGGING_CONFIG.media, 'Media service message');
```

**Environment-based Control**
For production builds, you can use environment variables:

```typescript
const ENABLE_LOGGING = __DEV__ || process.env.ENABLE_LOGGING === 'true';
```

#### Best Practices

1. **Always use the constant** - Never hardcode `true` or `false` in logger calls
2. **Set to `false` for production** - Disable verbose logging in production builds
3. **Use descriptive messages** - Include context and module names in log messages
4. **Log errors with context** - Always include relevant error information
5. **Consider performance** - Disable debug logging in performance-critical code paths

#### Error Logging Behavior

**Development Mode (`__DEV__ = true`)**:

- ✅ **Error logs are ALWAYS visible** regardless of `ENABLE_LOGGING` setting
- ✅ This ensures you never miss critical errors during development
- ✅ Other log levels (info, warn, debug) still respect the `ENABLE_LOGGING` setting

**Production Mode (`__DEV__ = false`)**:

- ✅ Error logs respect the `ENABLE_LOGGING` setting
- ✅ Set `ENABLE_LOGGING = false` to disable all logging in production

**Example**:

```typescript
const ENABLE_LOGGING = false; // Disable logging for this file

// In dev mode: ✅ This error will ALWAYS show
// In prod mode: ❌ This error will be hidden
logger.error(ENABLE_LOGGING, 'Critical error occurred');

// In dev mode: ❌ This info will be hidden (ENABLE_LOGGING = false)
// In prod mode: ❌ This info will be hidden (ENABLE_LOGGING = false)
logger.info(ENABLE_LOGGING, 'General information');
```

#### Log Levels

- `logger.error()` - Critical errors that need immediate attention
- `logger.warn()` - Warnings and non-critical issues
- `logger.info()` - General information and important events
- `logger.debug()` - Detailed debugging information (usually disabled in production)

#### Updating Existing Files

If you need to add logging to a new file or update an existing one, use the provided script:

```bash
node scripts/update-logger-constants.cjs
```

This script will automatically add the `ENABLE_LOGGING` constant and update all logger calls in the file.

## 🔧 Troubleshooting

### iOS Build Issues

#### PowerSync/op-sqlite Header Conflict

**Error**: When building for iOS, you may encounter this error:

```
❌  error: Multiple commands produce '/Users/.../Build/Products/Debug-iphonesimulator/op-sqlite/op_sqlite.framework/Headers/libsql.h'

duplicate output file '/Users/.../Build/Products/Debug-iphonesimulator/op-sqlite/op_sqlite.framework/Headers/libsql.h' on task: CpHeader
```

**Cause**: The `@op-engineering/op-sqlite` package has conflicting build phases that try to copy the same header file (`libsql.h`) multiple times during the iOS build process.

**Solution**: This issue has been fixed by modifying the `ios/Podfile` to remove duplicate header copy phases. The fix is already included in the project.

The following code was added to the `post_install` block in `ios/Podfile`:

```ruby
# Fix op-sqlite header conflict
installer.pods_project.targets.each do |target|
  if target.name == 'op-sqlite'
    target.build_phases.each do |build_phase|
      if build_phase.is_a?(Xcodeproj::Project::Object::PBXHeadersBuildPhase)
        # Remove duplicate header copy phases
        build_phase.files.each do |build_file|
          if build_file.file_ref&.display_name == 'libsql.h'
            build_phase.remove_build_file(build_file)
          end
        end
      end
    end
  end
end
```

This code:

1. Iterates through all pod targets
2. Finds the `op-sqlite` target specifically
3. Looks for header build phases
4. Removes any duplicate `libsql.h` header files
5. Prevents the "Multiple commands produce" error

If you encounter this issue:

1. **Clean the build cache**:

   ```bash
   npx expo run:ios --no-build-cache
   ```

2. **If the issue persists, reinstall pods**:

   ```bash
   cd ios
   pod install
   cd ..
   npx expo run:ios
   ```

3. **For persistent issues, clean everything**:
   ```bash
   rm -rf node_modules ios/Pods ios/build
   npm install
   cd ios && pod install && cd ..
   npx expo run:ios
   ```

**Note**: This fix modifies the `ios/Podfile` to automatically remove duplicate header files during the pod installation process. The modification is safe and only affects the problematic `op-sqlite` target.

#### Other Common iOS Issues

- **Metro bundler issues**: Clear cache with `npx expo start --clear`
- **Simulator issues**: Reset simulator with `xcrun simctl erase all`
- **Xcode build issues**: Clean derived data with `rm -rf ~/Library/Developer/Xcode/DerivedData`

### Android Build Issues

- **Gradle sync issues**: Run `cd android && ./gradlew clean && cd ..`
- **Metro bundler issues**: Clear cache with `npx expo start --clear`
- **Emulator issues**: Reset emulator or create new AVD

### PowerSync Issues

- **Schema conflicts**: Run `npm run powersync:verify-schema` to check for issues
- **Sync problems**: Check network connectivity and Supabase configuration
- **Database corruption**: Clear app data or reinstall development build
