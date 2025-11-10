# Projects Domain

Projects domain manages the recording app workflow: projects, sequences, segments, and media files.

## Purpose

This domain stores:

- Recording projects (source language → target language translations)
- Sequences (organized recordings targeting Bible content)
- Segments (individual audio/video recordings)
- Media files (final processed audio/video)
- Audio and text versions (published content)
- Tags and passages (content organization)
- Project updates (status updates with media)

## Core Tables

### `projects`

Recording projects with source/target languages and location. The main organizing entity.

### `sequences`

Organized recordings within a project. Targets specific Bible content (verses, chapters, books).

### `segments`

Individual source or target audio/video recordings. Raw recordings before processing.

### `sequences_segments`

Junction table linking sequences to segments with ordering and metadata.

### `sequences_tags`

Tags applied to sequences for organization.

### `sequences_targets`

What Bible content a sequence represents (verses, chapters, books, passages).

### `segments_targets`

What Bible content a segment represents.

## Media & Versions

### `media_files`

Processed audio/video files. Links to projects and language entities. Includes upload/publish status.

### `media_files_verses`

Junction table linking media files to verses they contain.

### `media_files_targets`

What Bible content a media file targets.

### `media_files_tags`

Tags applied to media files.

### `audio_versions`

Published audio versions (collections of media files). Links to projects and language entities.

### `text_versions`

Published text versions (translations). Links to projects and language entities.

## Content Organization

### `tags`

Reusable tags for organizing sequences and media files.

### `passages`

Custom passage definitions (verse ranges) for organizing content.

## Project Updates

### `project_updates`

Status updates for projects (progress reports, announcements).

### `project_updates_media`

Media files attached to project updates.

## Notes

- Projects are the main organizing entity for recording work
- Sequences organize recordings by Bible content
- Segments are raw recordings, media files are processed versions
- Audio/text versions are the published content users consume
- All tables use `created_by` (not `user_id`) indicating shared resources
