# Public Bible API

The Public Bible API provides programmatic access to published Bible content including audio and text versions. This API is protected by API key authentication and returns only content with `publish_status = 'published'`.

## Base URL

```
https://{project-ref}.supabase.co/functions/v1
```

Replace `{project-ref}` with your Supabase project reference ID.

## Authentication

All requests require an API key passed via the `X-API-Key` header.

```http
X-API-Key: your-api-key-here
```

To obtain an API key, contact the Every Language team.

## Response Format

All responses follow a consistent JSON structure:

### Success Response

```json
{
  "success": true,
  "data": {
    // Endpoint-specific data
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "details": "Optional additional details"
}
```

## HTTP Status Codes

- `200 OK` - Request successful
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid API key
- `405 Method Not Allowed` - HTTP method not supported
- `500 Internal Server Error` - Server error occurred

## CORS

The API supports Cross-Origin Resource Sharing (CORS) for browser-based applications.

**Allowed Origins:** `*` (all origins)

**Allowed Methods:** `GET`, `POST`, `OPTIONS`

**Allowed Headers:** `authorization`, `x-client-info`, `apikey`, `content-type`, `x-api-key`

## Rate Limiting

Currently, there are no rate limits enforced. However, we reserve the right to implement rate limiting in the future. Please use the API responsibly.

## Endpoints

- [Get Bible Audio](./get-bible-audio.md) - Retrieve published audio versions with media files and verse timing data
- [Get Bible Text](./get-bible-text.md) - Retrieve published text versions with verse content

## Data Models

### Audio Version

An audio version represents a complete audio Bible recording for a specific language and Bible structure.

```typescript
interface AudioVersion {
  id: string; // UUID
  language_entity_id: string; // UUID
  bible_version_id: string; // e.g., "bible-version-protestant-standard"
  project_id: string | null; // UUID or null
  name: string; // e.g., "BSB", "OMT", "Main"
  publish_status: 'published'; // Always "published" for API responses
  created_at: string; // ISO 8601 timestamp
  media_files: MediaFile[]; // Array of media files
}
```

### Media File

A media file represents an audio file (typically a chapter or section) within an audio version.

```typescript
interface MediaFile {
  id: string; // UUID
  language_entity_id: string; // UUID
  media_type: 'audio';
  object_key: string | null; // Storage object key
  storage_provider: string | null; // e.g., "r2"
  file_size: number | null; // Bytes
  duration_seconds: number | null; // Audio duration
  original_filename: string | null;
  file_type: string | null; // e.g., "mp3"
  publish_status: 'published'; // Always "published" for API responses
  created_at: string; // ISO 8601 timestamp
  audio_version_id: string; // UUID
  media_files_verses: MediaFileVerse[]; // Verse timing data
  signed_url?: string; // Pre-signed CDN URL (24-hour expiration)
}
```

### Media File Verse

Verse-level timing information for audio playback.

```typescript
interface MediaFileVerse {
  id: string; // UUID
  verse_id: string; // OSIS format, e.g., "gen-1-1"
  start_time_seconds: number; // Start time in audio file
  duration_seconds: number; // Verse duration
  created_at: string; // ISO 8601 timestamp
}
```

### Text Version

A text version represents a complete text Bible translation for a specific language and Bible structure.

```typescript
interface TextVersion {
  id: string; // UUID
  language_entity_id: string; // UUID
  bible_version_id: string; // e.g., "bible-version-protestant-standard"
  project_id: string | null; // UUID or null
  name: string; // e.g., "BSB - text", "NIV"
  text_version_source: string | null; // e.g., "user_submitted", "official_translation"
  publish_status: 'published'; // Always "published" for API responses
  created_at: string; // ISO 8601 timestamp
  verse_texts: VerseText[]; // Array of verse texts
}
```

### Verse Text

Individual verse content within a text version.

```typescript
interface VerseText {
  id: string; // UUID
  verse_id: string; // OSIS format, e.g., "gen-1-1"
  text_version_id: string; // UUID
  verse_text: string; // The actual verse text content
  created_at: string; // ISO 8601 timestamp
}
```

## Query Parameters

Both endpoints support optional query parameters for filtering results:

- `language_entity_id` (UUID) - Filter by language
- `bible_version_id` (string) - Filter by Bible structure (e.g., "bible-version-protestant-standard")
- `audio_version_id` (UUID) - Filter to specific audio version (audio endpoint only)
- `text_version_id` (UUID) - Filter to specific text version (text endpoint only)

All UUID parameters are validated and must match the UUID format. Invalid UUIDs will return a `400 Bad Request` error.

## Error Handling

The API uses standard HTTP status codes and provides clear error messages:

- **400 Bad Request**: Invalid query parameters (e.g., invalid UUID format)
- **401 Unauthorized**: Missing or invalid API key
- **405 Method Not Allowed**: Request method not supported (only GET is supported)
- **500 Internal Server Error**: Server-side error occurred

Example error response:

```json
{
  "success": false,
  "error": "Invalid language_entity_id format. Expected UUID."
}
```

## Examples

### JavaScript/TypeScript

```typescript
const API_KEY = 'your-api-key';
const BASE_URL = 'https://your-project.supabase.co/functions/v1';

// Get all published audio versions
const response = await fetch(`${BASE_URL}/get-bible-audio`, {
  headers: {
    'X-API-Key': API_KEY,
  },
});

const data = await response.json();
if (data.success) {
  console.log('Audio versions:', data.data.audio_versions);
}
```

### cURL

```bash
curl -X GET \
  "https://your-project.supabase.co/functions/v1/get-bible-audio" \
  -H "X-API-Key: your-api-key"
```

### Python

```python
import requests

API_KEY = 'your-api-key'
BASE_URL = 'https://your-project.supabase.co/functions/v1'

headers = {
    'X-API-Key': API_KEY,
}

response = requests.get(f'{BASE_URL}/get-bible-audio', headers=headers)
data = response.json()

if data['success']:
    print('Audio versions:', data['data']['audio_versions'])
```

## Support

For API access, support, or questions, please contact the Every Language team.
