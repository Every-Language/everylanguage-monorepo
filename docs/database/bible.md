# Bible Data Domain

Bible data contains the immutable structure and content of Bible versions, books, chapters, verses, and their text translations.

## Purpose

This domain stores:

- Bible version definitions (e.g., Catholic, Protestant, Septuagint)
- Book, chapter, and verse structure
- Text translations (verse texts in different languages)
- Image sets for Bible content

## Tables

### `bible_versions`

Different Bible structures (e.g., Catholic includes additional books).

### `books`

Books within a Bible version (e.g., Genesis, Exodus). Includes testament classification and global ordering.

### `chapters`

Chapters within books. Includes total verse count.

### `verses`

Individual verses within chapters.

### `verse_texts`

Actual text content for verses in different text versions (e.g., NIV, NLT, ESV).

### `text_versions`

Text translation versions (e.g., NIV, NLT) for a specific language and Bible version.

### `image_sets`

Collections of images associated with Bible content.

### `images`

Individual images linked to Bible content (verses, chapters, books) via polymorphic `target_type` and `target_id`.

## Notes

- Bible structure is reasonably immutable - changes are rare
- Text versions can be added/updated but are versioned
- Images support versioning and publish status
