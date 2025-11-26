# Bible App Technology Stack

## Overview

This document outlines the complete technology stack and best practices for the multilingual audio Bible application. The stack is designed for offline-first operation, global scalability, accessibility, and performance on older Android devices.

## Core Framework

### React Native

- **Version**: Latest stable with New Architecture enabled (0.80 at time of writing)
- **Architecture**: Fabric renderer + TurboModules for improved performance
- **Best Practices**:
  - Enable New Architecture in `react-native.config.js`
  - Use TypeScript for type safety
  - Implement proper error boundaries
  - Follow React Native performance guidelines
  - Use Flipper for debugging in development

## Data Layer

### SQLite

- **Purpose**: Local offline-first database
- **Best Practices**:
  - Design schema with proper indexing for search performance
  - Use migrations for schema changes
  - Implement proper foreign key constraints
  - Use transactions for batch operations
  - Create database backup/restore mechanisms
  - Optimize queries for large datasets (audio metadata, verses)

### Supabase Authentication

- **Purpose**: User authentication and session management
- **Best Practices**:
  - Implement anonymous authentication for offline users
  - Use Row Level Security (RLS) policies
  - Handle authentication state changes properly
  - Implement secure token refresh mechanisms
  - Support social login providers where culturally appropriate

### Supabase PostgreSQL

- **Purpose**: Real-time offline-first sync between local SQLite and cloud PostgreSQL
- **Best Practices**:
  - Design sync rules based on user permissions and data requirements
  - Implement conflict resolution strategies
  - Use incremental sync for large datasets
  - Handle network connectivity changes gracefully
  - Monitor sync performance and errors
  - Implement proper data partitioning for global scale

### Backblaze B2 File Storage

- **Purpose**: Audio file storage and CDN delivery
- **Best Practices**:
  - Implement proper bucket organization and naming conventions
  - Use CDN for global content delivery
  - Implement progressive download for large audio files
  - Use proper caching strategies
  - Implement file integrity checks
  - Handle storage quota and billing monitoring

## State Management

### Zustand

- **Purpose**: Global application state management
- **Best Practices**:
  - Keep stores focused and modular
  - Use immer middleware for complex state updates
  - Implement proper TypeScript typing for stores
  - Use subscriptions for component-specific state
  - Implement persistence middleware for critical state
  - Avoid storing large objects in global state

### TanStack Query

- **Purpose**: Server state management, caching, and synchronization
- **Best Practices**:
  - Implement proper query key factories
  - Use optimistic updates for better UX
  - Configure appropriate stale times and cache times
  - Implement proper error handling and retry logic
  - Use mutations for data modifications
  - Implement offline query support

## Media & Audio

### Expo Audio

- **Purpose**: Audio playback and recording
- **Best Practices**:
  - Configure background audio playback properly
  - Implement proper audio session management
  - Handle audio interruptions (calls, notifications)
  - Use appropriate audio quality settings for different network conditions
  - Implement proper cleanup of audio resources
  - Support accessibility features (voice control, screen readers)

### Expo Video (Future)

- **Purpose**: Video content playback for gospel films
- **Best Practices**:
  - Implement adaptive bitrate streaming
  - Use proper video caching strategies
  - Handle device orientation changes
  - Implement accessibility features (captions, audio descriptions)

## Internationalization

### i18n (React Native Localize + i18next)

- **Purpose**: Multi-language support and localization
- **Best Practices**:
  - Implement proper namespace organization for translations
  - Use ICU message format for complex pluralization
  - Implement RTL (Right-to-Left) language support
  - Use lazy loading for translation files
  - Implement proper fallback language chains
  - Support dynamic language switching
  - Handle date, number, and currency formatting per locale
  - Implement proper font support for various scripts

## Push Notifications

### Expo Notifications

- **Purpose**: Push notifications for engagement and updates
- **Best Practices**:
  - Implement proper permission handling
  - Use notification channels for Android
  - Implement deep linking from notifications
  - Handle notification scheduling for reading reminders
  - Implement proper notification analytics
  - Support rich notifications with images/actions
  - Handle notification badges and counts
  - Implement quiet hours and user preferences

## Native iOS tooling (CocoaPods)

- **Recommended install**: Use Homebrew CocoaPods (1.15.2+). Example: `brew install cocoapods`.
- **PATH precedence (Apple Silicon)**: Ensure Homebrew comes before Ruby gem shims so builds find the working `pod`.
  - Add to `~/.zshrc`:
    - `export PATH="/opt/homebrew/bin:$PATH"`
  - Verify:
    - `which -a pod` (Homebrew path should be first)
    - `pod --version` (≥ 1.15.2)
- **When builds cannot find CocoaPods**: EAS local builds use your shell PATH. If you see “CocoaPods is not available…”, fix PATH and re-run.
- **Clean install if versions mismatch**:
  - From `ios/`: `rm -rf Pods Podfile.lock && pod repo update && pod install`
- **Expo Doctor note**: A failing CocoaPods check is often due to PATH resolving to a broken gem shim. Preferring `/opt/homebrew/bin` typically resolves it.
