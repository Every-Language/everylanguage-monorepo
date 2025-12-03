# Codebase Organization Guide

This project uses a **feature-first** architecture with shared foundation, optimized for **Expo Managed Workflow**.

## Folder Structure

```
src/
├── app/                    # App-level configuration
│   ├── navigation/         # Navigation setup and routing
│   │   ├── stacks/        # Stack navigators
│   │   ├── tabs/          # Tab navigators
│   │   └── types/         # Navigation type definitions
│   ├── providers/         # Top-level providers
│   │   ├── auth/          # Authentication provider
│   │   ├── theme/         # Theme provider
│   │   ├── query/         # React Query provider
│   │   └── analytics/     # Analytics provider
│   └── config/            # App configuration
│       ├── env/           # Environment variables
│       ├── constants/     # App-wide constants
│       └── theme/         # Theme configuration
│
├── features/              # Feature modules (domain-driven)
│   ├── auth/              # Authentication feature
│   │   ├── components/    # Auth-specific components
│   │   ├── hooks/         # Auth-specific hooks
│   │   ├── services/      # Auth API calls and logic
│   │   ├── types/         # Auth type definitions
│   │   └── screens/       # Auth screens (Login, Register)
│   ├── bible/             # Bible reading feature
│   │   ├── components/    # Bible UI components
│   │   ├── hooks/         # Bible-specific hooks
│   │   ├── services/      # Bible data services
│   │   ├── types/         # Bible types (Verse, Chapter, etc.)
│   │   └── screens/       # Bible screens (Reader, ChapterList)
│   ├── audio/             # Audio playback feature
│   │   ├── components/    # Audio player components
│   │   ├── hooks/         # Audio hooks (usePlayer, useProgress)
│   │   ├── services/      # Audio service integration
│   │   ├── types/         # Audio types (Track, Playlist)
│   │   └── screens/       # Audio screens (Player, Queue)
│   ├── search/            # Search functionality
│   ├── bookmarks/         # Bookmarks and favorites
│   ├── settings/          # App settings
│   ├── sync/              # Data synchronization
│   ├── sharing/           # Content sharing
│   └── analytics/         # Analytics tracking
│
└── shared/                # Shared utilities and components
    ├── components/        # Reusable UI components
    │   ├── ui/            # Basic UI elements (Button, Input)
    │   ├── forms/         # Form components
    │   ├── layout/        # Layout components (Container, Grid)
    │   └── feedback/      # Feedback components (Toast, Modal)
    ├── hooks/             # Reusable hooks
    │   ├── api/           # API-related hooks
    │   ├── storage/       # Storage hooks
    │   ├── media/         # Media hooks
    │   └── navigation/    # Navigation hooks
    ├── utils/             # Utility functions
    │   ├── validation/    # Form validation utilities
    │   ├── formatting/    # Data formatting utilities
    │   ├── date/          # Date manipulation utilities
    │   ├── string/        # String manipulation utilities
    │   └── audio/         # Audio utilities
    ├── types/             # Shared type definitions
    │   ├── api/           # API response types
    │   ├── database/      # Database types
    │   └── app/           # App-wide types
    ├── constants/         # Shared constants
    │   ├── colors/        # Color constants
    │   ├── fonts/         # Font constants
    │   ├── dimensions/    # Dimension constants
    │   └── strings/       # String constants
    ├── services/          # Shared services
    │   ├── api/           # API client and configuration
    │   ├── storage/       # Storage services
    │   ├── analytics/     # Analytics service
    │   ├── auth/          # Authentication service
    │   ├── audio/         # Audio service
    │   ├── database/      # Database service
    │   └── sync/          # Sync service
    └── store/             # Global state management
        ├── slices/        # Zustand store slices
        └── middleware/    # Store middleware
```

## Organization Principles

### 1. Feature Modules

Each feature module should be:

- **Self-contained**: All feature-specific code lives together
- **Cohesive**: Related functionality is grouped
- **Loosely coupled**: Minimal dependencies on other features
- **Well-defined API**: Clear exports from index files

### 2. Shared Resources

Shared code should be:

- **Truly reusable**: Used by multiple features
- **Well-documented**: Clear purpose and usage
- **Stable**: Changes shouldn't break multiple features
- **Generic**: Not tied to specific business logic

### 3. Import Rules

#### Good Import Patterns

```typescript
// From shared utilities
import { formatDate } from '@/shared/utils/date';
import { Button } from '@/shared/components/ui';

// From same feature
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/LoginForm';

// From feature's public API
import { authService } from '@/features/auth';
```

#### Avoid These Patterns

```typescript
// DON'T: Cross-feature direct imports
import { BibleReader } from '@/features/bible/components/BibleReader';

// DON'T: Deep imports into shared modules
import { validateEmail } from '@/shared/utils/validation/email/validator';

// DON'T: Relative imports outside current feature
import { AudioPlayer } from '../../audio/components/AudioPlayer';
```

## File Naming Conventions

### Components

- **Pascal Case**: `BibleReader.tsx`, `AudioPlayer.tsx`
- **Descriptive**: Name should indicate purpose
- **Consistent**: Use same pattern across project

### Hooks

- **Camel Case with 'use' prefix**: `useAuth.ts`, `useBibleData.ts`
- **Descriptive**: Indicate what the hook provides

### Services

- **Camel Case with 'Service' suffix**: `authService.ts`, `audioService.ts`
- **Singular**: `userService.ts` not `usersService.ts`

### Utils

- **Camel Case**: `formatDate.ts`, `validateEmail.ts`
- **Verb-based**: Function name indicates action

### Types

- **Pascal Case**: `User.ts`, `BibleVerse.ts`
- **Singular**: `User.ts` not `Users.ts`
- **Interfaces**: Prefix with 'I' if needed: `IUser.ts`
