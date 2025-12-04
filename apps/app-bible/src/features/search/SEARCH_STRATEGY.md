# Search Feature Strategy & Design

## Overview

The search feature allows users to search across books, chapters, and verses with intelligent filtering and navigation. The search icon is positioned just before the menu icon in the TopBar component, providing quick access to comprehensive Bible search functionality.

## 1. Architecture & Data Strategy

### Database Schema Analysis

Based on the PowerSync schema, we have the following key tables:

- **Books**: `id`, `name`, `book_number`, `testament`, `global_order`
- **Chapters**: `id`, `chapter_number`, `book_id`, `total_verses`, `global_order`
- **Verses**: `id`, `verse_number`, `chapter_id`, `global_order`
- **Verse Texts**: `verse_id`, `text_version_id`, `verse_text`, `publish_status`

### Search Strategy

1. **Multi-level Search**: Search across book names, chapter numbers, and verse text content
2. **Fuzzy Matching**: Use SQLite FTS (Full Text Search) for verse text searching
3. **Smart Filtering**: Group results by type (Books, Chapters, Verses)
4. **Offline-First**: All search operations work offline using PowerSync local database

### Search Types

- **Book Search**: "Genesis", "John", "Psalms"
- **Chapter Search**: "Genesis 1", "John 3:16", "Psalm 23"
- **Verse Search**: "For God so loved", "In the beginning"
- **Mixed Search**: "love" (finds books, chapters, and verses containing "love")

## 2. UI/UX Design Strategy

### Search Icon Placement

- Position search icon in TopBar's `rightSection` just before the menu icon
- Use `search-outline` Ionicons icon for consistency
- Maintain 8px gap between search and menu icons

### Search Modal Design

- **Full-screen modal** with slide-up animation
- **Search bar** at top with clear button and loading indicator
- **Filter tabs** (All, Books, Chapters, Verses) below search bar
- **Results list** with grouped sections
- **Empty state** with helpful messaging
- **Recent searches** when no query is entered

### Result Item Design

- **Book results**: Book name, testament, chapter count
- **Chapter results**: Book name, chapter number, verse count
- **Verse results**: Book name, chapter:verse, highlighted text snippet

## 3. Technical Implementation Plan

### Components to Create

```
src/features/search/
├── components/
│   ├── SearchIcon.tsx              # TopBar search button
│   ├── SearchModal.tsx             # Full-screen search interface
│   ├── SearchBar.tsx               # Input with clear/loading states
│   ├── SearchFilters.tsx           # Tab-based filtering
│   ├── SearchResults.tsx           # Grouped results list
│   ├── SearchResultItem.tsx        # Individual result display
│   ├── RecentSearches.tsx          # Recent search history
│   └── index.ts
├── hooks/
│   ├── useSearch.ts                # Main search functionality
│   ├── useSearchHistory.ts         # Recent searches management
│   ├── useSearchFilters.ts         # Filter state management
│   └── index.ts
├── services/
│   ├── SearchService.ts            # Core search logic
│   ├── SearchHistoryService.ts     # Recent searches management
│   ├── SearchIndexService.ts       # FTS index management
│   └── index.ts
├── types/
│   ├── search.ts                   # Search-related types
│   └── index.ts
├── utils/
│   ├── searchUtils.ts              # Search utility functions
│   └── index.ts
└── index.ts
```

### Services Architecture

1. **SearchService**: Core search logic with PowerSync queries
2. **SearchHistoryService**: Recent searches management with local storage
3. **SearchIndexService**: FTS index management and optimization

### Hooks Architecture

1. **useSearch**: Main search functionality with debouncing
2. **useSearchHistory**: Recent searches management
3. **useSearchFilters**: Filter state management

## 4. Search Functionality Features

### Smart Features

- **Auto-complete**: Show suggestions as user types
- **Search history**: Remember recent searches
- **Quick navigation**: Tap result to navigate directly to verse
- **Highlight matching text**: Show search term in context
- **Search within results**: Filter current results further

### Search Queries

```typescript
// Book search
SELECT * FROM books WHERE name LIKE '%query%' ORDER BY global_order

// Chapter search
SELECT c.*, b.name as book_name
FROM chapters c
JOIN books b ON c.book_id = b.id
WHERE b.name LIKE '%query%' OR c.chapter_number = query_number

// Verse search (FTS)
SELECT v.*, vt.verse_text, b.name as book_name, c.chapter_number
FROM verses v
JOIN verse_texts vt ON v.id = vt.verse_id
JOIN chapters c ON v.chapter_id = c.id
JOIN books b ON c.book_id = b.id
WHERE verse_texts MATCH 'query*'
```

## 5. Performance Optimizations

### Database Optimizations

- Create FTS virtual table for verse texts
- Index book names and chapter numbers
- Use prepared statements for repeated queries
- Implement search result caching

### UI Optimizations

- Debounce search input (300ms delay)
- Virtualize long result lists using FlashList
- Lazy load search results
- Cache search history locally

## 6. Implementation Phases

### Phase 1: Basic Search (Week 1)

1. Add search icon to TopBar
2. Create SearchModal with basic UI
3. Implement book and chapter search
4. Add navigation to search results

### Phase 2: Verse Search (Week 2)

1. Implement FTS for verse text
2. Add verse search functionality
3. Create search result highlighting
4. Add search history

### Phase 3: Advanced Features (Week 3)

1. Add search filters and tabs
2. Implement auto-complete
3. Add search within results
4. Performance optimizations

### Phase 4: Polish (Week 4)

1. Add empty states and loading indicators
2. Implement search analytics
3. Add accessibility features
4. Final UI/UX refinements

## 7. UI Design Specifications

### Search Icon

- Size: 24px
- Color: `theme.colors.text`
- Padding: 8px
- Active opacity: 0.7

### Search Modal

- Background: `theme.colors.background`
- Header height: 60px
- Search bar height: 48px
- Filter tabs height: 44px
- Result item height: 64px (book/chapter), 80px (verse)

### Search Bar

- Border radius: 12px
- Background: `theme.colors.surface`
- Border: 1px solid `theme.colors.border`
- Focus border: `theme.colors.primary`

### Result Items

- **Book**: Icon + name + testament
- **Chapter**: Book name + chapter number + verse count
- **Verse**: Book name + reference + text snippet (max 2 lines)

## 8. Type Definitions

```typescript
// Search Types
export interface SearchResult {
  id: string;
  type: 'book' | 'chapter' | 'verse';
  title: string;
  subtitle?: string;
  metadata?: string;
  bookId?: string;
  chapterId?: string;
  verseId?: string;
  relevanceScore?: number;
}

export interface SearchFilters {
  type: 'all' | 'books' | 'chapters' | 'verses';
  testament?: 'OT' | 'NT';
  textVersion?: string;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  filters: SearchFilters;
  loading: boolean;
  error: string | null;
  recentSearches: string[];
}

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  resultCount: number;
}
```

## 9. Navigation Integration

### Search Result Navigation

```typescript
// Navigate to specific verse
navigation.navigate('BibleChapters', {
  book: { id: bookId, name: bookName },
  initialChapter: chapterNumber,
});

// Navigate to specific chapter
navigation.navigate('ChapterVerses', {
  book: { id: bookId, name: bookName },
  chapter: { id: chapterId, chapter_number: chapterNumber },
});
```

## 10. Accessibility & Localization

### Accessibility

- Screen reader support for search results
- Keyboard navigation support
- High contrast mode compatibility
- Voice search integration (future)

### Localization

- Search placeholder text
- Empty state messages
- Filter tab labels
- Error messages

## 11. Analytics & Metrics

### Search Analytics

- Search query frequency
- Result click-through rates
- Search completion rates
- Popular search terms
- Search performance metrics

## 12. Future Enhancements

### Advanced Features

- **Voice Search**: Speech-to-text search input
- **Search Suggestions**: AI-powered search suggestions
- **Search Filters**: Date range, book type, language filters
- **Saved Searches**: Save and organize favorite searches
- **Search Sharing**: Share search results with others
- **Cross-Reference Search**: Find related verses and passages

### Integration Opportunities

- **Bookmark Integration**: Search within bookmarked verses
- **Playlist Integration**: Search within playlist content
- **Media Integration**: Search within audio transcriptions
- **Note Integration**: Search within user notes and highlights

## 13. Testing Strategy

### Unit Tests

- Search service functions
- Search utility functions
- Search hook logic
- Search history management

### Integration Tests

- Search modal navigation
- Search result interactions
- Search performance
- Offline search functionality

### E2E Tests

- Complete search workflows
- Search result navigation
- Search history persistence
- Search performance under load

## 14. Success Metrics

### User Engagement

- Search usage frequency
- Search result click-through rates
- Search completion rates
- User satisfaction scores

### Performance Metrics

- Search response time
- Search accuracy
- Search result relevance
- Search error rates

This comprehensive strategy provides a roadmap for implementing a powerful, user-friendly search feature that integrates seamlessly with the existing Bible app architecture while maintaining the offline-first approach and following established design patterns.
