# PowerSync Query Performance Monitoring System

A robust, dev-only query performance monitoring system for PowerSync database operations.

## 🎯 Overview

This system provides automatic query performance monitoring with:

- **Zero production overhead** - Only runs in development mode
- **Automatic cleanup** - Prevents memory leaks with orphaned query detection
- **Centralized queries** - No duplication between logging and execution
- **Enhanced result detection** - Automatically detects result counts from various formats
- **Comprehensive logging** - Tracks slow queries, errors, and performance metrics

## 🚀 Quick Start

### 1. Basic Hook Usage

```typescript
import { useQueryLogger } from '@/shared/hooks/useQueryLogger';
import { QUERIES } from '@/shared/constants/queries';

const MyHook = () => {
  const { logQuery } = useQueryLogger('my-hook');

  const { data } = useQuery({
    queryKey: ['my-data', id],
    queryFn: async () => {
      return await logQuery(QUERIES.MY_QUERY, async () => {
        return await powerSyncSystem.getAll(QUERIES.MY_QUERY, [id]);
      });
    },
  });
};
```

### 2. Manual Start/End Logging

```typescript
const MyHook = () => {
  const { logQueryStart, logQueryEnd } = useQueryLogger('my-hook');

  const fetchData = async () => {
    const id = logQueryStart('SELECT * FROM my_table WHERE id = ?');

    try {
      const result = await powerSyncSystem.getAll(
        'SELECT * FROM my_table WHERE id = ?',
        [id]
      );
      logQueryEnd(id, result.length);
      return result;
    } catch (error) {
      logQueryEnd(id, undefined, error.message);
      throw error;
    }
  };
};
```

## 📊 Performance Monitoring

### Real-time Performance Hook

```typescript
import { useQueryPerformance } from '@/shared/hooks/useQueryPerformance';

const PerformanceMonitor = () => {
  const performance = useQueryPerformance();

  return (
    <View>
      <Text>Total Queries: {performance.totalQueries}</Text>
      <Text>Slow Queries: {performance.slowQueries}</Text>
      <Text>Average Time: {performance.averageTime}ms</Text>
      <Text>Active Queries: {performance.activeQueries}</Text>
      <Text>Health Status: {performance.isHealthy ? '✅' : '⚠️'}</Text>
    </View>
  );
};
```

### Debug Component (Development Only)

```typescript
import { QueryPerformanceDebug } from '@/shared/components/QueryPerformanceDebug';

const MyScreen = () => {
  return (
    <View>
      <MyContent />
      <QueryPerformanceDebug /> {/* Only shows in development */}
    </View>
  );
};
```

## 🛠️ Configuration

### Environment Variables

```bash
# Enable monitoring in production (optional)
ENABLE_POWERSYNC_MONITORING=true
```

### Performance Thresholds

The system automatically categorizes queries by performance:

- **Fast**: < 1000ms (logged as info)
- **Slow**: 1000-2000ms (logged as warn)
- **Very Slow**: 2000-5000ms (logged as warn)
- **Critical**: > 5000ms (logged as error)

## 📝 Centralized Query Constants

### Adding New Queries

```typescript
// src/shared/constants/queries.ts
export const QUERIES = {
  // ... existing queries

  MY_NEW_QUERY: `
    SELECT 
      t.*,
      u.name as user_name
    FROM my_table t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.status = ?
    ORDER BY t.created_at DESC
  `,
} as const;
```

### Using Query Constants

```typescript
// ✅ Good - No duplication
const { logQuery } = useQueryLogger('my-hook');
return await logQuery(QUERIES.MY_NEW_QUERY, async () => {
  return await powerSyncSystem.getAll(QUERIES.MY_NEW_QUERY, [status]);
});

// ❌ Bad - Duplication
const query = 'SELECT * FROM my_table WHERE id = ?';
return await logQuery(query, async () => {
  return await powerSyncSystem.getAll(query, [id]);
});
```

## 🔍 Logging Output Examples

### Successful Query

```
[QueryLogger] ✅ Query completed: use-verses-with-texts (45ms)
{
  id: "query_1703123456789_abc123",
  query: "SELECT v.*, vt.verse_text FROM verses v LEFT JOIN verse_texts vt ON v.id = vt.verse_id AND vt.text_version_id = ? WHERE v.chapter_id = ? ORDER BY v.verse_number ASC",
  resultCount: 25,
  duration: 45
}
```

### Slow Query Warning

```
[QueryLogger] 🐌 Slow query: use-chapters-with-metadata (1250ms)
{
  id: "query_1703123456790_def456",
  query: "SELECT c.*, b.name as book_name, COALESCE(mf_counts.media_file_count, 0) as media_file_count FROM chapters c LEFT JOIN books b ON c.book_id = b.id LEFT JOIN (SELECT chapter_id, COUNT(1) as media_file_count FROM media_files WHERE deleted_at IS NULL AND (? IS NULL OR audio_version_id = ?) GROUP BY chapter_id) mf_counts ON mf_counts.chapter_id = c.id WHERE c.book_id = ? ORDER BY c.chapter_number ASC",
  resultCount: 150,
  duration: 1250,
  severity: "MEDIUM"
}
```

### Query Error

```
[QueryLogger] ❌ Query error: use-verses-with-texts (23ms)
{
  id: "query_1703123456791_ghi789",
  query: "SELECT v.*, vt.verse_text FROM verses v LEFT JOIN verse_texts vt ON v.id = vt.verse_id AND vt.text_version_id = ? WHERE v.chapter_id = ? ORDER BY v.verse_number ASC",
  error: "no such column: vt.verse_text",
  duration: 23,
  context: "use-verses-with-texts"
}
```

### Orphaned Query Detection

```
[QueryLogger] ⚠️ Orphaned query detected: use-chapters-with-metadata (30000ms)
{
  id: "query_1703123456792_jkl012",
  query: "SELECT c.*, b.name as book_name FROM chapters c LEFT JOIN books b ON c.book_id = b.id WHERE c.book_id = ? ORDER BY c.chapter_number ASC",
  duration: 30000,
  context: "use-chapters-with-metadata"
}
```

## 🧹 Automatic Cleanup

The system automatically handles:

- **Orphaned Queries**: Queries that don't complete within 30 seconds
- **Memory Management**: Keeps only the last 50 completed queries
- **Periodic Cleanup**: Removes old data every 5 minutes
- **Timeout Cleanup**: Clears timeouts when queries complete

## 🎛️ Advanced Usage

### Custom Query ID

```typescript
const { logQuery } = useQueryLogger('my-hook');

return await logQuery(
  QUERIES.MY_QUERY,
  async () => {
    return await powerSyncSystem.getAll(QUERIES.MY_QUERY, [id]);
  },
  'custom-query-id' // Custom ID for tracking
);
```

### Performance Analysis

```typescript
import { queryLogger } from '@/shared/utils/queryLogger';

// Get recent performance summary
const performance = queryLogger.getRecentPerformance();
console.log('Performance Summary:', performance);

// Get active queries
const activeQueries = queryLogger.getActiveQueries();
console.log('Active Queries:', activeQueries);
```

## 🚨 Best Practices

### 1. Always Use Centralized Queries

```typescript
// ✅ Good
const query = QUERIES.VERSES_WITH_TEXTS;

// ❌ Bad
const query =
  'SELECT v.*, vt.verse_text FROM verses v LEFT JOIN verse_texts vt...';
```

### 2. Use Descriptive Context Names

```typescript
// ✅ Good
const { logQuery } = useQueryLogger('use-verses-with-texts');

// ❌ Bad
const { logQuery } = useQueryLogger('hook1');
```

### 3. Handle Errors Properly

```typescript
// ✅ Good - Errors are automatically logged
return await logQuery(query, async () => {
  return await powerSyncSystem.getAll(query, params);
});

// ❌ Bad - Manual error handling
try {
  return await logQuery(query, async () => {
    return await powerSyncSystem.getAll(query, params);
  });
} catch (error) {
  // Don't manually log errors - the system handles this
  throw error;
}
```

### 4. Use Appropriate Query Keys

```typescript
// ✅ Good - Include all dependencies
queryKey: ['verses-with-texts', chapterId, textVersionId];

// ❌ Bad - Missing dependencies
queryKey: ['verses-with-texts', chapterId];
```

## 🔧 Troubleshooting

### Common Issues

1. **Queries not being logged**
   - Check if `__DEV__` is true
   - Verify `ENABLE_POWERSYNC_MONITORING` environment variable

2. **Memory leaks**
   - System automatically cleans up orphaned queries
   - Check for queries that don't call `logQueryEnd`

3. **Performance issues**
   - Monitor slow query logs
   - Use centralized query constants to avoid duplication
   - Check for N+1 query patterns

### Debug Mode

Enable detailed logging by setting the logger level:

```typescript
// In your app initialization
import { logger } from '@/shared/utils/logger';

// Enable debug logging for query monitoring
logger.setLevel('debug');
```

## 📈 Performance Metrics

The system tracks:

- **Query Duration**: Time from start to completion
- **Result Count**: Number of rows returned
- **Error Rate**: Percentage of failed queries
- **Slow Query Rate**: Percentage of queries > 1000ms
- **Active Query Count**: Currently running queries
- **Memory Usage**: Number of tracked queries

## 🎯 Integration with Existing Hooks

The system has been integrated with:

- ✅ `useVersesWithTexts` - Verse text queries
- ✅ `useChaptersWithMetadata` - Chapter metadata queries
- 🔄 `useBooks` - Book listing queries (pending)
- 🔄 `useMediaFiles` - Media file queries (pending)
- 🔄 `useDownloadStatus` - Download status queries (pending)

## 🚀 Future Enhancements

- [ ] Query result caching
- [ ] Performance trend analysis
- [ ] Automatic query optimization suggestions
- [ ] Integration with analytics service
- [ ] Performance alerts and notifications
