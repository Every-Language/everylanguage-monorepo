#!/usr/bin/env ts-node
/// <reference types="node" />

/**
 * Script to add query logging to all PowerSync queries across the app
 * This script identifies all files with PowerSync queries and provides
 * instructions for adding query logging
 */

import * as fs from 'fs';
import * as path from 'path';

interface PowerSyncFile {
  filePath: string;
  queryCount: number;
  queries: string[];
}

function findPowerSyncFiles(dir: string): PowerSyncFile[] {
  const results: PowerSyncFile[] = [];

  function scanDirectory(currentDir: string) {
    const files = fs.readdirSync(currentDir);

    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);

      if (
        stat.isDirectory() &&
        !file.startsWith('.') &&
        file !== 'node_modules'
      ) {
        scanDirectory(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check if file contains PowerSync queries
        const powerSyncMatches = content.match(
          /powerSyncSystem\.(getAll|get|execute|watch)/g
        );
        if (powerSyncMatches && powerSyncMatches.length > 0) {
          // Extract query strings
          const queryMatches = content.match(
            /powerSyncSystem\.(getAll|get|execute|watch)\s*\(\s*[`'"]([^`'"]*)[`'"]/g
          );
          const queries = queryMatches
            ? queryMatches
                .map((match: string) => {
                  const queryMatch = match.match(/[`'"]([^`'"]*)[`'"]/);
                  return queryMatch ? queryMatch[1] : '';
                })
                .filter(
                  (q: string | undefined): q is string =>
                    q !== undefined && q.length > 0
                )
            : [];

          results.push({
            filePath: filePath.replace(process['cwd'](), ''),
            queryCount: powerSyncMatches.length,
            queries: queries.slice(0, 3), // Show first 3 queries
          });
        }
      }
    }
  }

  scanDirectory(dir);
  return results;
}

function generateUpdateInstructions(files: PowerSyncFile[]): string {
  let instructions = `# PowerSync Query Logging Update Instructions

## Files that need query logging added:

`;

  files.forEach((file, index) => {
    instructions += `### ${index + 1}. ${file.filePath}
- **Query Count**: ${file.queryCount}
- **Sample Queries**: ${file.queries.length > 0 ? file.queries.join(', ') : 'Complex queries detected'}

**Required Changes:**
1. Add imports:
   \`\`\`typescript
   import { useQueryLogger } from '@/shared/hooks/useQueryLogger';
   import { QUERIES } from '@/shared/constants/queries';
   \`\`\`

2. Add query logger hook:
   \`\`\`typescript
   const { logQuery } = useQueryLogger('context-name');
   \`\`\`

3. Wrap PowerSync queries:
   \`\`\`typescript
   return await logQuery(
     QUERIES.QUERY_NAME,
     async () => {
       return await powerSyncSystem.getAll(QUERIES.QUERY_NAME, params);
     }
   );
   \`\`\`

4. Add query constants to \`src/shared/constants/queries.ts\`

---

`;
  });

  instructions += `
## Summary
- **Total Files**: ${files.length}
- **Total Queries**: ${files.reduce((sum, file) => sum + file.queryCount, 0)}

## Next Steps
1. Update each file following the pattern above
2. Add all new queries to the centralized constants
3. Test the application to ensure all queries are properly logged
4. Monitor the development logs for query performance insights

## Query Constants to Add
Add these to \`src/shared/constants/queries.ts\`:

\`\`\`typescript
export const QUERIES = {
  // ... existing queries
  
  // Add new queries here based on the files above
} as const;
\`\`\`
`;

  return instructions;
}

// Main execution
const srcDir = path.join(process['cwd'](), 'src');
const powerSyncFiles = findPowerSyncFiles(srcDir);

console.log(`Found ${powerSyncFiles.length} files with PowerSync queries:`);
powerSyncFiles.forEach((file, index) => {
  console.log(`${index + 1}. ${file.filePath} (${file.queryCount} queries)`);
});

// Generate instructions
const instructions = generateUpdateInstructions(powerSyncFiles);
fs.writeFileSync('POWERSYNC_QUERY_LOGGING_INSTRUCTIONS.md', instructions);

console.log('\n✅ Generated POWERSYNC_QUERY_LOGGING_INSTRUCTIONS.md');
console.log('📋 Review the instructions and update the remaining files');
