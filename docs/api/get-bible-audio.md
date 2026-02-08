# Get Bible Audio

Retrieve published audio versions with nested media files and verse timing data. This endpoint returns audio Bible recordings that are publicly available.

## Endpoint

```
GET /functions/v1/get-bible-audio
```

## Authentication

Required: `X-API-Key` header

## Query Parameters

All parameters are optional. Multiple parameters can be combined to filter results.

| Parameter            | Type   | Description                        | Example                                |
| -------------------- | ------ | ---------------------------------- | -------------------------------------- |
| `language_entity_id` | UUID   | Filter by language entity ID       | `39040994-e865-4914-bc0d-a0ec94c683dd` |
| `bible_version_id`   | string | Filter by Bible structure version  | `bible-version-protestant-standard`    |
| `audio_version_id`   | UUID   | Filter to a specific audio version | `dffd85ec-d3ba-49cd-acb7-b17ccaa7f312` |

### Parameter Validation

- UUID parameters (`language_entity_id`, `audio_version_id`) must be valid UUIDs
- Invalid UUID format returns `400 Bad Request` with error message
- Empty or missing parameters are ignored (no filtering applied)

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "audio_versions": [
      {
        "id": "dffd85ec-d3ba-49cd-acb7-b17ccaa7f312",
        "language_entity_id": "39040994-e865-4914-bc0d-a0ec94c683dd",
        "language_name": "English",
        "bible_version_id": "bible-version-protestant-standard",
        "project_id": "c8fc4478-62b2-4e8d-8d12-56fa3e8782a3",
        "name": "Main",
        "publish_status": "published",
        "created_at": "2025-11-24T10:28:41.984+00:00",
        "media_files": [
          {
            "id": "ee786d11-8b9a-4398-bfa0-a11662725724",
            "language_entity_id": "39040994-e865-4914-bc0d-a0ec94c683dd",
            "media_type": "audio",
            "object_key": "media/88a5f757-bdc6-4faf-ae9e-3020f9a72b67.mp3",
            "storage_provider": "r2",
            "file_size": 2689243,
            "duration_seconds": 190,
            "original_filename": "Titus_001.mp3",
            "file_type": "mp3",
            "publish_status": "published",
            "created_at": "2026-01-08T15:10:00.779+00:00",
            "audio_version_id": "dffd85ec-d3ba-49cd-acb7-b17ccaa7f312",
            "media_files_verses": [
              {
                "id": "f3b67ac7-97b9-4038-9c45-4fe0a8165f9e",
                "verse_id": "exod-29-1",
                "start_time_seconds": 3.08,
                "duration_seconds": 10.52,
                "created_at": "2025-08-22T09:20:18.724175+00:00"
              }
            ],
            "signed_url": "https://cdn.everylanguage.com/media/88a5f757-bdc6-4faf-ae9e-3020f9a72b67.mp3?exp=1770546909&token=3a92fd579e432a53caa7d415b81f52708e2d39fec36f4cb5da4ae40d7277a171&env=dev"
          }
        ]
      }
    ],
    "expires_in_seconds": 86400,
    "url_errors": {
      "media-file-id": "Error message if URL generation failed"
    }
  }
}
```

### Response Fields

#### Root Level

- `audio_versions` (array) - Array of audio version objects
- `expires_in_seconds` (number) - Signed URL expiration time in seconds (default: 86400 = 24 hours)
- `url_errors` (object, optional) - Map of media file IDs to error messages if signed URL generation failed for specific files

#### Audio Version Object

- `id` (string, UUID) - Unique identifier for the audio version
- `language_entity_id` (string, UUID) - Language entity this version is for
- `language_name` (string) - Display name of the language (e.g., "English", "Spanish", "French")
- `bible_version_id` (string) - Bible structure version (e.g., "bible-version-protestant-standard")
- `project_id` (string, UUID | null) - Associated project ID, if any
- `name` (string) - Display name of the audio version (e.g., "BSB", "OMT", "Main")
- `publish_status` (string) - Always "published" for API responses
- `created_at` (string, ISO 8601) - Creation timestamp
- `media_files` (array) - Array of media file objects

#### Media File Object

- `id` (string, UUID) - Unique identifier for the media file
- `language_entity_id` (string, UUID) - Language entity this file is for
- `media_type` (string) - Always "audio"
- `object_key` (string | null) - Storage object key/path
- `storage_provider` (string | null) - Storage provider (e.g., "r2")
- `file_size` (number | null) - File size in bytes
- `duration_seconds` (number | null) - Audio duration in seconds
- `original_filename` (string | null) - Original filename
- `file_type` (string | null) - File type/extension (e.g., "mp3")
- `publish_status` (string) - Always "published" for API responses
- `created_at` (string, ISO 8601) - Creation timestamp
- `audio_version_id` (string, UUID) - Parent audio version ID
- `media_files_verses` (array) - Array of verse timing objects
- `signed_url` (string, optional) - Pre-signed CDN URL for downloading the file (24-hour expiration)

#### Media File Verse Object

- `id` (string, UUID) - Unique identifier
- `verse_id` (string) - OSIS format verse ID (e.g., "gen-1-1", "exod-29-1")
- `start_time_seconds` (number) - Start time of verse in the audio file
- `duration_seconds` (number) - Duration of verse in seconds
- `created_at` (string, ISO 8601) - Creation timestamp

### Error Responses

#### 400 Bad Request - Invalid UUID Format

```json
{
  "success": false,
  "error": "Invalid language_entity_id format. Expected UUID."
}
```

#### 401 Unauthorized - Missing API Key

```json
{
  "success": false,
  "error": "Missing API key. Provide X-API-Key header."
}
```

#### 401 Unauthorized - Invalid API Key

```json
{
  "success": false,
  "error": "Invalid API key"
}
```

#### 405 Method Not Allowed

```json
{
  "success": false,
  "error": "Method not allowed"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Database error: [error message]"
}
```

## Filtering Behavior

- Only audio versions with `publish_status = 'published'` are returned
- Only media files with `publish_status = 'published'` are included
- Soft-deleted records (`deleted_at IS NOT NULL`) are excluded
- If `audio_version_id` is provided, only that specific version is returned
- If `language_entity_id` is provided, only versions for that language are returned
- If `bible_version_id` is provided, only versions for that Bible structure are returned
- Multiple filters can be combined (AND logic)

## Signed URLs

Each media file includes a `signed_url` field containing a pre-signed CDN URL that allows direct download of the audio file. These URLs:

- Expire after 24 hours (86400 seconds)
- Include authentication tokens in query parameters
- Can be used directly in audio players or download links
- May include `env=dev` parameter in development environments

If signed URL generation fails for a specific file, the error is included in the `url_errors` object, but the request still succeeds with the media file data (without the `signed_url` field).

## Examples

### Get All Published Audio Versions

```bash
curl -X GET \
  "https://your-project.supabase.co/functions/v1/get-bible-audio" \
  -H "X-API-Key: your-api-key"
```

### Filter by Language

```bash
curl -X GET \
  "https://your-project.supabase.co/functions/v1/get-bible-audio?language_entity_id=39040994-e865-4914-bc0d-a0ec94c683dd" \
  -H "X-API-Key: your-api-key"
```

### Get Specific Audio Version

```bash
curl -X GET \
  "https://your-project.supabase.co/functions/v1/get-bible-audio?audio_version_id=dffd85ec-d3ba-49cd-acb7-b17ccaa7f312" \
  -H "X-API-Key: your-api-key"
```

### Combine Filters

```bash
curl -X GET \
  "https://your-project.supabase.co/functions/v1/get-bible-audio?language_entity_id=39040994-e865-4914-bc0d-a0ec94c683dd&bible_version_id=bible-version-protestant-standard" \
  -H "X-API-Key: your-api-key"
```

### JavaScript Example

```javascript
async function getAudioVersions(filters = {}) {
  const params = new URLSearchParams();
  if (filters.languageEntityId) {
    params.append('language_entity_id', filters.languageEntityId);
  }
  if (filters.bibleVersionId) {
    params.append('bible_version_id', filters.bibleVersionId);
  }
  if (filters.audioVersionId) {
    params.append('audio_version_id', filters.audioVersionId);
  }

  const url = `https://your-project.supabase.co/functions/v1/get-bible-audio?${params}`;

  const response = await fetch(url, {
    headers: {
      'X-API-Key': 'your-api-key',
    },
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data.audio_versions;
}

// Usage
const versions = await getAudioVersions({
  languageEntityId: '39040994-e865-4914-bc0d-a0ec94c683dd',
});
```

### Python Example

```python
import requests

def get_audio_versions(api_key, language_entity_id=None, bible_version_id=None, audio_version_id=None):
    url = 'https://your-project.supabase.co/functions/v1/get-bible-audio'
    headers = {'X-API-Key': api_key}
    params = {}

    if language_entity_id:
        params['language_entity_id'] = language_entity_id
    if bible_version_id:
        params['bible_version_id'] = bible_version_id
    if audio_version_id:
        params['audio_version_id'] = audio_version_id

    response = requests.get(url, headers=headers, params=params)
    data = response.json()

    if not data['success']:
        raise Exception(data['error'])

    return data['data']['audio_versions']

# Usage
versions = get_audio_versions(
    api_key='your-api-key',
    language_entity_id='39040994-e865-4914-bc0d-a0ec94c683dd'
)
```

## Notes

- Audio versions are returned with all associated published media files
- Media files include verse-level timing data (`media_files_verses`) for precise audio playback
- Signed URLs are generated server-side and expire after 24 hours
- Empty results return an empty array `[]`, not an error
- The `!inner` join ensures only audio versions with at least one published media file are returned
