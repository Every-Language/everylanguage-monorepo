# Get Bible Text

Retrieve published text versions with nested verse text content. This endpoint returns text Bible translations that are publicly available.

## Endpoint

```
GET /functions/v1/get-bible-text
```

## Authentication

Required: `X-API-Key` header

## Query Parameters

All parameters are optional. Multiple parameters can be combined to filter results.

| Parameter            | Type   | Description                       | Example                                |
| -------------------- | ------ | --------------------------------- | -------------------------------------- |
| `language_entity_id` | UUID   | Filter by language entity ID      | `bf937d24-ae29-4219-9102-b8e2b471fee8` |
| `bible_version_id`   | string | Filter by Bible structure version | `bible-version-protestant-standard`    |
| `text_version_id`    | UUID   | Filter to a specific text version | `b572e95a-9e12-416d-9966-59ec170e4507` |

### Parameter Validation

- UUID parameters (`language_entity_id`, `text_version_id`) must be valid UUIDs
- Invalid UUID format returns `400 Bad Request` with error message
- Empty or missing parameters are ignored (no filtering applied)

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "text_versions": [
      {
        "id": "b572e95a-9e12-416d-9966-59ec170e4507",
        "language_entity_id": "bf937d24-ae29-4219-9102-b8e2b471fee8",
        "language_name": "English",
        "bible_version_id": "bible-version-protestant-standard",
        "project_id": "307a348b-218e-40ca-8477-5e94261550ed",
        "name": "BSB - text",
        "text_version_source": "user_submitted",
        "publish_status": "published",
        "created_at": "2025-07-31T11:59:03.783+00:00",
        "verse_texts": [
          {
            "id": "effe4a9d-85f8-4c07-9f48-89d606f44605",
            "verse_id": "gen-1-1",
            "text_version_id": "b572e95a-9e12-416d-9966-59ec170e4507",
            "verse_text": "In the beginning God created the heavens and the earth.",
            "created_at": "2025-07-31T12:20:26.622+00:00"
          },
          {
            "id": "fec10414-0ca9-48f4-9c4a-a146c6714fbc",
            "verse_id": "gen-1-2",
            "text_version_id": "b572e95a-9e12-416d-9966-59ec170e4507",
            "verse_text": "Now the earth was formless and void, and darkness was over the surface of the deep. And the Spirit of God was hovering over the surface of the waters.",
            "created_at": "2025-07-31T12:20:26.622+00:00"
          }
        ]
      }
    ]
  }
}
```

### Response Fields

#### Root Level

- `text_versions` (array) - Array of text version objects

#### Text Version Object

- `id` (string, UUID) - Unique identifier for the text version
- `language_entity_id` (string, UUID) - Language entity this version is for
- `language_name` (string) - Display name of the language (e.g., "English", "Spanish", "French")
- `bible_version_id` (string) - Bible structure version (e.g., "bible-version-protestant-standard")
- `project_id` (string, UUID | null) - Associated project ID, if any
- `name` (string) - Display name of the text version (e.g., "BSB - text", "NIV")
- `text_version_source` (string | null) - Source type (e.g., "user_submitted", "official_translation", "ai_transcription")
- `publish_status` (string) - Always "published" for API responses
- `created_at` (string, ISO 8601) - Creation timestamp
- `verse_texts` (array) - Array of verse text objects

#### Verse Text Object

- `id` (string, UUID) - Unique identifier for the verse text
- `verse_id` (string) - OSIS format verse ID (e.g., "gen-1-1", "john-3-16")
- `text_version_id` (string, UUID) - Parent text version ID
- `verse_text` (string) - The actual verse text content
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

- Only text versions with `publish_status = 'published'` are returned
- Soft-deleted records (`deleted_at IS NOT NULL`) are excluded
- If `text_version_id` is provided, only that specific version is returned
- If `language_entity_id` is provided, only versions for that language are returned
- If `bible_version_id` is provided, only versions for that Bible structure are returned
- Multiple filters can be combined (AND logic)
- Text versions may have empty `verse_texts` arrays if no verses are published

## Examples

### Get All Published Text Versions

```bash
curl -X GET \
  "https://your-project.supabase.co/functions/v1/get-bible-text" \
  -H "X-API-Key: your-api-key"
```

### Filter by Language

```bash
curl -X GET \
  "https://your-project.supabase.co/functions/v1/get-bible-text?language_entity_id=bf937d24-ae29-4219-9102-b8e2b471fee8" \
  -H "X-API-Key: your-api-key"
```

### Get Specific Text Version

```bash
curl -X GET \
  "https://your-project.supabase.co/functions/v1/get-bible-text?text_version_id=b572e95a-9e12-416d-9966-59ec170e4507" \
  -H "X-API-Key: your-api-key"
```

### Combine Filters

```bash
curl -X GET \
  "https://your-project.supabase.co/functions/v1/get-bible-text?language_entity_id=bf937d24-ae29-4219-9102-b8e2b471fee8&bible_version_id=bible-version-protestant-standard" \
  -H "X-API-Key: your-api-key"
```

### JavaScript Example

```javascript
async function getTextVersions(filters = {}) {
  const params = new URLSearchParams();
  if (filters.languageEntityId) {
    params.append('language_entity_id', filters.languageEntityId);
  }
  if (filters.bibleVersionId) {
    params.append('bible_version_id', filters.bibleVersionId);
  }
  if (filters.textVersionId) {
    params.append('text_version_id', filters.textVersionId);
  }

  const url = `https://your-project.supabase.co/functions/v1/get-bible-text?${params}`;

  const response = await fetch(url, {
    headers: {
      'X-API-Key': 'your-api-key',
    },
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data.text_versions;
}

// Usage
const versions = await getTextVersions({
  languageEntityId: 'bf937d24-ae29-4219-9102-b8e2b471fee8',
});

// Access verse texts
versions.forEach(version => {
  console.log(`Version: ${version.name}`);
  version.verse_texts.forEach(verse => {
    console.log(`${verse.verse_id}: ${verse.verse_text}`);
  });
});
```

### Python Example

```python
import requests

def get_text_versions(api_key, language_entity_id=None, bible_version_id=None, text_version_id=None):
    url = 'https://your-project.supabase.co/functions/v1/get-bible-text'
    headers = {'X-API-Key': api_key}
    params = {}

    if language_entity_id:
        params['language_entity_id'] = language_entity_id
    if bible_version_id:
        params['bible_version_id'] = bible_version_id
    if text_version_id:
        params['text_version_id'] = text_version_id

    response = requests.get(url, headers=headers, params=params)
    data = response.json()

    if not data['success']:
        raise Exception(data['error'])

    return data['data']['text_versions']

# Usage
versions = get_text_versions(
    api_key='your-api-key',
    language_entity_id='bf937d24-ae29-4219-9102-b8e2b471fee8'
)

# Access verse texts
for version in versions:
    print(f"Version: {version['name']}")
    for verse in version['verse_texts']:
        print(f"{verse['verse_id']}: {verse['verse_text']}")
```

### Finding a Specific Verse

```javascript
function findVerse(textVersions, verseId) {
  for (const version of textVersions) {
    const verse = version.verse_texts.find(v => v.verse_id === verseId);
    if (verse) {
      return {
        version: version.name,
        verse: verse,
      };
    }
  }
  return null;
}

// Usage
const versions = await getTextVersions({
  languageEntityId: 'bf937d24-ae29-4219-9102-b8e2b471fee8',
});

const john316 = findVerse(versions, 'john-3-16');
if (john316) {
  console.log(`${john316.version}: ${john316.verse.verse_text}`);
}
```

## Notes

- Text versions are returned with all associated published verse texts
- Verse IDs use OSIS format (e.g., "gen-1-1", "john-3-16")
- Empty `verse_texts` arrays are possible if a version has no published verses
- The response does not include pagination; all verse texts for matching versions are returned
- Verse texts are not guaranteed to be in any particular order
- For large text versions, consider filtering by `text_version_id` to get specific versions
