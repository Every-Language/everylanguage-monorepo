# Search Result Navigation Implementation

## Overview

This document describes the implementation of search result navigation that behaves exactly like user clicks on books, chapters, and verses from the main Bible interface.

## Architecture

### 1. Navigation Service (`SearchNavigationService.ts`)

The core navigation logic is implemented in `SearchNavigationService.ts` with three separate functions:

- **`navigateToBook`**: Navigates to book chapters (like clicking a book from BibleBooksScreen)
- **`navigateToChapter`**: Navigates directly to chapter verses
- **`navigateToVerse`**: Navigates to chapter with specific verse highlighted

### 2. Navigation Hook (`useSearchNavigation.ts`)

Provides a React hook interface for components to use the navigation functionality:

```typescript
const {
  handleSearchResultPress,
  navigateToBook,
  navigateToChapter,
  navigateToVerse,
} = useSearchNavigation();
```

### 3. Updated Components

- **`SearchResults.tsx`**: Now uses the navigation hook by default
- **`SearchResultItem.tsx`**: Handles individual result clicks

## Usage Examples

### Basic Usage in Search Results

```typescript
import { SearchResults } from '@/features/search/components/SearchResults';

// The component now handles navigation automatically
<SearchResults results={searchResults} />
```

### Custom Navigation Handler

```typescript
import { useSearchNavigation } from '@/features/search/hooks/useSearchNavigation';

const MySearchComponent = () => {
  const { handleSearchResultPress } = useSearchNavigation();

  return (
    <SearchResults
      results={results}
      onResultPress={handleSearchResultPress}
    />
  );
};
```

### Individual Navigation Functions

```typescript
import { useSearchNavigation } from '@/features/search/hooks/useSearchNavigation';

const MyComponent = () => {
  const { navigateToBook, navigateToChapter, navigateToVerse } =
    useSearchNavigation();

  const handleBookClick = (bookResult: BookSearchResult) => {
    navigateToBook(bookResult);
  };

  const handleChapterClick = (chapterResult: ChapterSearchResult) => {
    navigateToChapter(chapterResult);
  };

  const handleVerseClick = (verseResult: VerseSearchResult) => {
    navigateToVerse(verseResult);
  };
};
```

## Navigation Behavior

### Navigation Hierarchy

The search modal is in the root navigation stack, but Bible screens are nested deeper. The navigation service properly handles this hierarchy:

**Navigation Path**: `RootNavigator` → `Home` → `Bible` → `BibleRoot` → `BibleStack`

### Book Navigation

- **Target**: `BibleChapters` screen (via nested navigation)
- **Behavior**: Identical to clicking a book from `BibleBooksScreen`
- **Data**: Transforms `BookSearchResult` to `BookWithMetadata`
- **Navigation**: `Home` → `Bible` → `BibleRoot` → `BibleChapters`

### Chapter Navigation

- **Target**: `BibleVerses` screen (via nested navigation)
- **Behavior**: Goes directly to chapter verses
- **Data**: Creates both book and chapter metadata
- **Navigation**: `Home` → `Bible` → `BibleRoot` → `BibleVerses`

### Verse Navigation

- **Target**: `BibleVerses` screen with verse targeting (via nested navigation)
- **Behavior**: Auto-scrolls to specific verse
- **Data**: Creates book, chapter, and verse metadata with `verseId` and `hydrated: true`
- **Navigation**: `Home` → `Bible` → `BibleRoot` → `BibleVerses`

## Data Transformation

The service automatically transforms search results into the proper navigation data structures:

### BookSearchResult → BookWithMetadata

```typescript
{
  id: result.id,
  name: result.name,
  book_number: result.book_number,
  testament: result.testament,
  global_order: result.global_order ?? result.book_number,
  chaptersCount: result.chapter_count,
}
```

### ChapterSearchResult → ChapterWithMetadata

```typescript
{
  id: result.id,
  chapter_number: result.chapter_number,
  book_id: result.book_id,
  total_verses: result.total_verses ?? 0,
  // ... additional metadata fields
}
```

## Error Handling

The navigation service includes comprehensive error handling:

1. **Data Validation**: Checks for required fields before navigation
2. **Graceful Fallbacks**: Falls back to `BibleBooks` screen on errors
3. **Console Logging**: Logs errors for debugging
4. **Type Safety**: Uses TypeScript for compile-time safety

## Testing

The implementation includes comprehensive tests in `SearchNavigationService.test.ts`:

- ✅ Navigation handler creation
- ✅ Book navigation with valid data
- ✅ Chapter navigation with valid data
- ✅ Verse navigation with valid data
- ✅ Error handling for invalid data
- ✅ Unknown result type handling

## Integration Points

### Search Service Integration

When implementing the search service, ensure search results include the `type` property:

```typescript
// Book search result
{
  type: 'book',
  id: 'book-1',
  name: 'Genesis',
  book_number: 1,
  testament: 'OT',
  chapter_count: 50,
}

// Chapter search result
{
  type: 'chapter',
  id: 'chapter-1',
  chapter_number: 1,
  book_id: 'book-1',
  book_name: 'Genesis',
  total_verses: 31,
}

// Verse search result
{
  type: 'verse',
  id: 'verse-1',
  verse_number: 1,
  chapter_id: 'chapter-1',
  chapter_number: 1,
  book_id: 'book-1',
  book_name: 'Genesis',
  verse_text: 'In the beginning...',
  text_snippet: 'In the beginning...',
}
```

### Navigation Stack Management

The service handles navigation stack properly:

- **Nested Navigation**: Properly navigates through the nested navigation hierarchy
- **Root to Bible**: Navigates from root level (SearchModal) to nested Bible screens
- **Context Preservation**: Maintains proper navigation context across navigators
- **Stack Management**: Avoids duplicate screens and maintains clean navigation history

## Future Enhancements

### Potential Improvements

1. **Analytics Integration**: Track search result clicks
2. **Deep Linking**: Support for search result deep links
3. **Search History**: Remember navigation patterns
4. **Custom Animations**: Smooth transitions for search navigation

### Performance Optimizations

1. **Lazy Loading**: Load book/chapter metadata on demand
2. **Caching**: Cache frequently accessed navigation data
3. **Preloading**: Preload likely navigation targets

## Troubleshooting

### Common Issues

1. **Navigation Not Working**: Check that search results have the `type` property
2. **Wrong Screen**: Verify the navigation target matches the result type
3. **Missing Data**: Ensure all required fields are present in search results
4. **Type Errors**: Check TypeScript types match the expected interfaces

### Debug Tips

1. Enable console logging to see navigation calls
2. Check navigation stack state
3. Verify search result data structure
4. Test with different result types

## Conclusion

This implementation provides a robust, type-safe, and user-friendly search result navigation system that seamlessly integrates with the existing Bible app navigation patterns. The separation of concerns allows for easy testing, maintenance, and future enhancements.
