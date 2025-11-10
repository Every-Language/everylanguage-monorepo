# Web Project Dashboard

Recording app dashboard for managing Bible translation projects, audio uploads, and content.

## Purpose

The project dashboard enables recording teams to:

- Create and manage translation projects
- Upload and manage audio files
- Upload and manage text translations
- Mark verse timings in audio files
- Manage project team members
- Track project progress

## Stack

- **Framework**: React 19 with TypeScript 5.8
- **Build Tool**: Vite 7
- **Routing**: React Router v6
- **State Management**:
  - TanStack Query 5.83 for server state
  - Zustand 5.0 for client state (project selection, upload state)
- **Styling**: TailwindCSS with custom design system
- **UI Components**: Radix UI primitives + Headless UI
- **Audio**: react-h5-audio-player for audio playback
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Vercel

## Architecture

### Client-Side Routing

Uses React Router with:

- Public routes: `/login`, `/register`, `/forgot-password`
- Protected routes: All dashboard routes require authentication
- Lazy loading: Pages are code-split for performance

### State Management

- **TanStack Query**: Server state (projects, media files, API calls)
- **Zustand Stores**:
  - Project store (selected project, project list)
  - Auth store (authentication state)
  - Upload state (file upload progress)
- **React Context**: Auth context for authentication

### File Upload

- Direct multipart uploads to Supabase Storage
- Progress tracking with resumable uploads
- Automatic metadata extraction from filenames

## Codebase Organization

```
src/
├── app/              # App-level pages
│   └── pages/       # Top-level page components
├── features/         # Feature-based modules
│   ├── auth/        # Authentication
│   ├── bible-content/ # Bible content management
│   ├── community-check/ # Community review features
│   ├── dashboard/   # Project dashboard
│   ├── image-management/ # Image upload/management
│   ├── media-files/  # Audio file management
│   ├── projects/     # Project CRUD operations
│   ├── upload/       # File upload functionality
│   └── user-management/ # User management
├── shared/          # Shared code
│   ├── components/   # Reusable components
│   ├── design-system/ # Design system components
│   ├── hooks/        # Custom React hooks
│   ├── providers/    # Context providers
│   ├── services/     # API services
│   ├── stores/       # Zustand stores
│   └── utils/        # Utility functions
├── lib/             # Library setup
│   ├── query-client.ts
│   └── query-error-handler.ts
├── App.tsx          # Root component with routing
└── main.tsx         # Entry point
```

### Feature Structure

Each feature follows this pattern:

- `components/` - Feature-specific components
- `pages/` - Page components (route handlers)
- `hooks/` - Feature-specific hooks
- `api/` or `queries/` - TanStack Query hooks
- `types.ts` - Feature-specific types

### Shared Code

- `shared/components/` - Reusable UI components
- `shared/design-system/` - Design system components (buttons, inputs, etc.)
- `shared/hooks/` - Custom React hooks
- `shared/stores/` - Zustand stores
- `shared/services/` - API services and Supabase client

## Key Features

- **Project Management**: Create, edit, and manage translation projects
- **Audio Upload**: Upload audio files with automatic verse detection
- **Verse Timing**: Mark verse boundaries in audio files
- **Text Upload**: Upload text translations via CSV
- **Media Management**: View and manage uploaded media files
- **Progress Tracking**: Track Bible translation progress
- **Team Management**: Manage project team members
- **Image Management**: Upload and manage images for projects

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

## Environment Variables

See `env.example` for required environment variables. Main variables:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_SUPABASE_STORAGE_BUCKET` - Storage bucket name
