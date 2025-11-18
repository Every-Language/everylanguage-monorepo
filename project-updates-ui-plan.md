# Project Updates UI Implementation Plan

## Overview

Build UI in `web-project-dashboard` to allow users to create project updates with media attachments (images/videos). This will mirror the read-only functionality in `web-partnership-dashboard` but add creation/editing capabilities.

## Database Schema Reference

### `project_updates` table

- `id` (UUID, primary key)
- `project_id` (UUID, FK to projects)
- `title` (TEXT, required)
- `body` (TEXT, required)
- `created_at` (TIMESTAMPTZ)
- `created_by` (UUID, FK to users)
- `updated_at` (TIMESTAMPTZ, nullable)
- `deleted_at` (TIMESTAMPTZ, nullable, soft delete)

### `project_updates_media` table

- `id` (UUID, primary key)
- `project_update_id` (UUID, FK to project_updates)
- `media_type` (enum: 'image' | 'video')
- `object_key` (TEXT, required) - R2 storage key
- `storage_provider` (TEXT, default 'r2')
- `original_filename` (TEXT)
- `file_type` (TEXT) - MIME type
- `file_size` (BIGINT)
- `caption` (TEXT, nullable)
- `display_order` (INT, default 0)
- `duration_seconds` (INTEGER, nullable, required for videos)
- `thumbnail_object_key` (TEXT, nullable, for videos)
- `created_at` (TIMESTAMPTZ)
- `created_by` (UUID, FK to users)
- `deleted_at` (TIMESTAMPTZ, nullable, soft delete)

### RLS Policies

- **Read**: Partner org members OR project members (viewer+)
- **Insert**: Project members with `project.write` permission
- **Update**: Project members with `project.write` permission
- **Delete**: Project members with `project.delete` permission (soft delete)

## Feature Structure

### 1. Feature Module: `project-updates`

**Location**: `apps/web-project-dashboard/src/features/project-updates/`

**Structure**:

```
project-updates/
├── components/
│   ├── ProjectUpdatesList/
│   │   ├── ProjectUpdatesList.tsx          # List view of updates
│   │   ├── ProjectUpdateCard.tsx           # Individual update card
│   │   ├── MediaAttachment.tsx             # Media display component
│   │   └── index.ts
│   ├── CreateProjectUpdateModal/
│   │   ├── CreateProjectUpdateModal.tsx    # Modal for creating updates
│   │   ├── UpdateForm.tsx                  # Form fields (title, body)
│   │   ├── MediaUploadSection.tsx          # Media upload UI
│   │   ├── MediaPreview.tsx                # Preview uploaded media
│   │   └── index.ts
│   ├── EditProjectUpdateModal/
│   │   ├── EditProjectUpdateModal.tsx      # Modal for editing updates
│   │   └── index.ts
│   └── index.ts
├── hooks/
│   ├── useProjectUpdates.ts                # Query hook (fetch updates)
│   ├── useCreateProjectUpdate.ts           # Mutation hook (create update)
│   ├── useUpdateProjectUpdate.ts           # Mutation hook (update update)
│   ├── useDeleteProjectUpdate.ts           # Mutation hook (soft delete)
│   ├── useProjectUpdateMediaUpload.ts      # Hook for media upload flow
│   └── index.ts
├── services/
│   ├── projectUpdateService.ts             # Service layer for API calls
│   └── index.ts
├── types/
│   ├── projectUpdate.ts                    # TypeScript types
│   └── index.ts
├── pages/
│   ├── ProjectUpdatesPage.tsx              # Main page component
│   └── index.ts
└── index.ts
```

## Implementation Details

### 2. Data Fetching Hook

**File**: `hooks/useProjectUpdates.ts`

```typescript
// Similar to web-partnership-dashboard but adapted for web-project-dashboard
// Query project updates for a specific project
// Include: project, media, creator relationships
// Order by created_at DESC
// Filter deleted_at IS NULL
```

**Key differences from partnership dashboard**:

- Single project context (no 'all' option)
- Use `useSelectedProject` hook for project context
- Include edit/delete actions in response

### 3. Mutation Hooks

**File**: `hooks/useCreateProjectUpdate.ts`

- Use `useMutation` from TanStack Query
- Insert into `project_updates` table
- Handle media attachments separately (after update creation)
- Invalidate `['project-updates', projectId]` query on success
- Show toast notifications

**File**: `hooks/useUpdateProjectUpdate.ts`

- Update existing update (title, body)
- Handle media additions/deletions
- Invalidate queries on success

**File**: `hooks/useDeleteProjectUpdate.ts`

- Soft delete (set `deleted_at`)
- Invalidate queries on success

### 4. Media Upload Flow

**File**: `hooks/useProjectUpdateMediaUpload.ts`

**Flow**:

1. User selects files (images/videos)
2. Validate file types and sizes
3. For each file:
   - Create pending `project_updates_media` record
   - Get presigned PUT URL from edge function (need to extend `get-upload-urls-by-id` or create new function)
   - Upload file to R2 using presigned URL
   - Update media record with metadata (file_size, duration for videos, etc.)
4. Handle progress tracking
5. Handle errors and retries

**Edge Function Consideration**:

- Current `get-upload-urls-by-id` handles `mediaFileIds` and `imageIds`
- Need to extend or create new function for `projectUpdatesMediaIds`
- Or create generic function that handles multiple entity types

**Alternative**: Create new edge function `get-project-update-media-upload-urls` that:

- Accepts `projectUpdateMediaIds: string[]`
- Returns presigned PUT URLs
- Updates `project_updates_media` records with object_key

### 5. Create Update Modal Component

**File**: `components/CreateProjectUpdateModal/CreateProjectUpdateModal.tsx`

**Features**:

- Form fields:
  - Title (required, text input)
  - Body (required, textarea with markdown support or rich text)
- Media upload section:
  - Drag & drop zone
  - File picker button
  - Preview uploaded files
  - Remove file option
  - Add captions to media
  - Reorder media (drag & drop)
- Validation:
  - Title required
  - Body required
  - At least one media file OR body content
- Submit flow:
  1. Create project update record
  2. Upload media files (if any)
  3. Link media to update
  4. Show success toast
  5. Close modal
  6. Refresh updates list

**UI Components to reuse**:

- `Button`, `Input`, `Textarea` from design system
- `FileUpload` component (if exists) or create new
- `Modal` or `Dialog` component

### 6. Media Upload Component

**File**: `components/CreateProjectUpdateModal/MediaUploadSection.tsx`

**Features**:

- Drag & drop zone
- File input button
- File type validation (images: jpg, png, gif, webp; videos: mp4, webm)
- File size limits (configurable, e.g., 50MB for images, 500MB for videos)
- Preview grid:
  - Image thumbnails
  - Video thumbnails (first frame or placeholder)
  - File name
  - File size
  - Remove button
  - Caption input (optional)
- Drag & drop reordering
- Upload progress indicators
- Error handling (file too large, invalid type, upload failed)

**Video handling**:

- Extract duration using browser APIs or ffmpeg.wasm
- Generate thumbnail (first frame) or use placeholder
- Store duration_seconds and thumbnail_object_key

### 7. List View Component

**File**: `components/ProjectUpdatesList/ProjectUpdatesList.tsx`

**Features**:

- Display updates in reverse chronological order
- Each update shows:
  - Title
  - Body (with markdown/rich text rendering)
  - Created date (relative time)
  - Creator name
  - Media attachments (grid layout)
  - Edit button (if user has write permission)
  - Delete button (if user has delete permission)
- Empty state when no updates
- Loading state
- Error state

**File**: `components/ProjectUpdatesList/ProjectUpdateCard.tsx`

- Individual update card component
- Reusable from list view
- Shows media attachments using `MediaAttachment` component

**File**: `components/ProjectUpdatesList/MediaAttachment.tsx`

- Display individual media item
- Image: Show thumbnail, click to view full size
- Video: Show thumbnail with play button, click to play
- Show caption if available
- Show file metadata (type, size)

### 8. Page Component

**File**: `pages/ProjectUpdatesPage.tsx`

**Features**:

- Header with "Project Updates" title
- "Create Update" button (opens modal)
- `ProjectUpdatesList` component
- Uses `useSelectedProject` for project context
- Shows error if no project selected

**Routing**:

- Add route: `/project/:projectId/updates` or `/updates` (if project context is global)

## Technical Considerations

### 9. Edge Function for Media Upload URLs

**Option A**: Extend existing `get-upload-urls-by-id`

- Add `projectUpdateMediaIds?: string[]` parameter
- Handle `project_updates_media` table
- Return presigned URLs

**Option B**: Create new function `get-project-update-media-upload-urls`

- Dedicated function for project update media
- Cleaner separation of concerns
- Easier to extend with project-update-specific logic

**Recommendation**: Option B (new function)

**Function signature**:

```typescript
{
  projectUpdateMediaIds: string[];
  expirationHours?: number;
  originalFilenames?: Record<string, string>;
}
```

**Response**:

```typescript
{
  success: boolean;
  media: Array<{
    id: string;
    objectKey: string;
    uploadUrl: string;
  }>;
  errors?: Record<string, string>;
}
```

### 10. File Upload Store (Optional)

**Consideration**: Create Zustand store similar to `mediaFileUpload.ts` and `imageUpload.ts`

**Benefits**:

- Centralized upload state management
- Progress tracking
- Error handling
- Retry logic

**File**: `stores/projectUpdateMediaUpload.ts`

**State**:

- Current batch of files being uploaded
- Progress per file
- Upload status (idle, uploading, completed, error)
- Callbacks for completion

### 11. Type Definitions

**File**: `types/projectUpdate.ts`

```typescript
export interface ProjectUpdate {
  id: string;
  project_id: string;
  title: string;
  body: string;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  project?: {
    id: string;
    name: string;
  };
  media?: ProjectUpdateMedia[];
  creator?: {
    id: string;
    full_name: string | null;
  };
}

export interface ProjectUpdateMedia {
  id: string;
  project_update_id: string;
  media_type: 'image' | 'video';
  object_key: string;
  storage_provider: string;
  original_filename: string | null;
  file_type: string | null;
  file_size: number | null;
  caption: string | null;
  display_order: number;
  duration_seconds: number | null;
  thumbnail_object_key: string | null;
  created_at: string;
  created_by: string | null;
}

export interface CreateProjectUpdateData {
  project_id: string;
  title: string;
  body: string;
  media?: Array<{
    file: File;
    caption?: string;
    display_order: number;
  }>;
}

export interface UpdateProjectUpdateData {
  title?: string;
  body?: string;
  mediaToAdd?: Array<{
    file: File;
    caption?: string;
    display_order: number;
  }>;
  mediaToRemove?: string[]; // media IDs
  mediaToUpdate?: Array<{
    id: string;
    caption?: string;
    display_order?: number;
  }>;
}
```

### 12. Service Layer

**File**: `services/projectUpdateService.ts`

**Functions**:

- `createProjectUpdate(data: CreateProjectUpdateData): Promise<ProjectUpdate>`
- `updateProjectUpdate(id: string, data: UpdateProjectUpdateData): Promise<ProjectUpdate>`
- `deleteProjectUpdate(id: string): Promise<void>`
- `uploadMediaFiles(updateId: string, files: File[]): Promise<ProjectUpdateMedia[]>`
- `getMediaDownloadUrls(mediaIds: string[]): Promise<Record<string, string>>`

## Implementation Order

1. **Phase 1: Foundation**
   - [ ] Create feature module structure
   - [ ] Define TypeScript types
   - [ ] Create `useProjectUpdates` query hook (read-only)
   - [ ] Create `ProjectUpdatesList` component (read-only)
   - [ ] Create `ProjectUpdatesPage` page component
   - [ ] Add routing

2. **Phase 2: Edge Function**
   - [ ] Create `get-project-update-media-upload-urls` edge function
   - [ ] Test edge function with sample requests
   - [ ] Deploy edge function

3. **Phase 3: Media Upload**
   - [ ] Create `useProjectUpdateMediaUpload` hook
   - [ ] Create `MediaUploadSection` component
   - [ ] Create `MediaPreview` component
   - [ ] Test media upload flow

4. **Phase 4: Create Update**
   - [ ] Create `useCreateProjectUpdate` mutation hook
   - [ ] Create `CreateProjectUpdateModal` component
   - [ ] Integrate media upload with update creation
   - [ ] Test full create flow

5. **Phase 5: Edit & Delete**
   - [ ] Create `useUpdateProjectUpdate` mutation hook
   - [ ] Create `useDeleteProjectUpdate` mutation hook
   - [ ] Create `EditProjectUpdateModal` component
   - [ ] Add edit/delete buttons to update cards
   - [ ] Test edit/delete flows

6. **Phase 6: Polish**
   - [ ] Add loading states
   - [ ] Add error handling
   - [ ] Add toast notifications
   - [ ] Add empty states
   - [ ] Improve media display (lightbox, video player)
   - [ ] Add markdown/rich text support for body
   - [ ] Add drag & drop reordering for media

## Testing Considerations

- Test with different file types (images, videos)
- Test with large files (verify size limits)
- Test with multiple files
- Test error scenarios (network failure, invalid file, permission denied)
- Test RLS policies (user without write permission cannot create)
- Test media upload progress tracking
- Test media reordering
- Test update creation with and without media
- Test update editing (add/remove/update media)
- Test soft delete

## Dependencies

- TanStack Query (already in use)
- Zustand (already in use)
- Supabase client (already in use)
- Edge functions (already set up)
- R2 storage (already configured)
- Design system components (Button, Input, Modal, etc.)

## Future Enhancements

- Rich text editor for body (Tiptap, Slate, etc.)
- Markdown preview
- Video thumbnail generation
- Image optimization/compression
- Bulk media operations
- Update templates
- Scheduled updates
- Update notifications
- Export updates (PDF, etc.)
