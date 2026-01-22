#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const GENERATED_SCHEMA_FILE = 'powersync/AppSchema.generated.ts';
const LOCAL_SCHEMA_FILE = 'powersync/LocalSchema.ts';
const INDEXES_FILE = 'powersync/schema-indexes.ts';
const OUTPUT_APP_SCHEMA_FILE = 'powersync/AppSchema.ts';

function exitWithError(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function readFileOrExit(filePath) {
  if (!fs.existsSync(filePath)) {
    exitWithError(`File not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function extractSyncedTablesMap(generatedContent) {
  const schemaMatch = generatedContent.match(
    /export const AppSchema = new Schema\((\{[\s\S]*?\})\);/
  );
  if (!schemaMatch) {
    exitWithError('Could not locate AppSchema object in generated schema');
  }
  const schemaObjectLiteral = schemaMatch[1];

  const keyed = Array.from(
    schemaObjectLiteral.matchAll(/\b([a-zA-Z0-9_]+)\b\s*:/g)
  ).map(m => m[1]);
  // Match table names followed by comma OR closing brace (for last item)
  const shorthand = Array.from(
    schemaObjectLiteral.matchAll(/\b([a-zA-Z0-9_]+)\b\s*[,}]/g)
  ).map(m => m[1]);
  const candidateNames = Array.from(new Set([...keyed, ...shorthand]));
  const declaredTables = candidateNames.filter(name =>
    new RegExp(`const\\s+${name}\\s*=\\s*new\\s+Table`).test(generatedContent)
  );
  const entries = declaredTables.map(name => `  ${name}`).join(',\n');
  return { entries, declaredTables };
}

function stripCommentsAndTrailingCommas(src) {
  let out = src.replace(/(^|\s)\/\/.*$/gm, '$1');
  out = out.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/,\s*(\}|\])/g, '$1');
  return out;
}

function extractObjectLiteralByBraces(src, startIndex) {
  const openIndex = src.indexOf('{', startIndex);
  if (openIndex === -1) return null;
  let depth = 0;
  for (let i = openIndex; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return src.substring(openIndex, i + 1);
      }
    }
  }
  return null;
}

function loadIndexConfig() {
  const src = readFileOrExit(INDEXES_FILE);
  const assignIdx = src.indexOf('export const tableIndexes');
  if (assignIdx === -1) {
    console.warn(
      '⚠️ No tableIndexes found in powersync/schema-indexes.ts, skipping index patching'
    );
    return {};
  }

  const eqIdx = src.indexOf('=', assignIdx);
  if (eqIdx === -1) {
    console.warn(
      '⚠️ Could not find assignment for tableIndexes; skipping index patching'
    );
    return {};
  }
  const objLiteral = extractObjectLiteralByBraces(src, eqIdx);
  if (!objLiteral) {
    console.warn(
      '⚠️ Could not parse tableIndexes object; skipping index patching'
    );
    return {};
  }

  try {
    let jsonish = stripCommentsAndTrailingCommas(objLiteral);
    jsonish = jsonish.replace(/'/g, '"');
    jsonish = jsonish.replace(
      /([,{]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g,
      '$1"$2":'
    );
    const parsed = JSON.parse(jsonish);
    const keys = Object.keys(parsed);
    console.log(
      `🔎 Loaded tableIndexes for ${keys.length} tables: ${keys.join(', ')}`
    );
    return parsed;
  } catch (e) {
    console.warn(
      '⚠️ Failed to parse tableIndexes; skipping index patching. Error:',
      e.message
    );
    return {};
  }
}

function buildIndexObjectLiteral(indexes) {
  if (!Array.isArray(indexes) || indexes.length === 0) return '{}';
  const entries = indexes
    .map((cols, i) => `idx_${i}: [${cols.map(c => `'${c}'`).join(', ')}]`)
    .join(', ');
  return `{ ${entries} }`;
}

function patchIndexesIntoGenerated(generatedContent, tableIndexes) {
  let patchedCount = 0;
  const result = generatedContent.replace(
    /const\s+(\w+)\s*=\s*new\s+Table\(([\s\S]*?)\)\s*;/g,
    (full, tableName, args) => {
      const idx = tableIndexes[tableName];
      if (!idx) return full;

      const twoArgMatch = args.match(/^([\s\S]*?),\s*\{([\s\S]*)\}\s*$/);
      let columnsPart = args;
      let optionsPart = null;
      if (twoArgMatch) {
        columnsPart = twoArgMatch[1];
        optionsPart = `{${twoArgMatch[2]}}`;
      }

      const indexesLiteral = buildIndexObjectLiteral(idx);

      if (!optionsPart) {
        patchedCount++;
        console.log(`🧩 Injecting indexes for table: ${tableName}`);
        return `const ${tableName} = new Table(${columnsPart}, { indexes: ${indexesLiteral} });`;
      }

      if (/indexes:\s*\{[\s\S]*?\}/.test(optionsPart)) {
        optionsPart = optionsPart.replace(
          /indexes:\s*\{[\s\S]*?\}/,
          `indexes: ${indexesLiteral}`
        );
      } else {
        optionsPart = optionsPart.replace(
          /^\{/,
          `{ indexes: ${indexesLiteral}, `
        );
      }
      patchedCount++;
      console.log(`🧩 Replacing indexes for table: ${tableName}`);
      return `const ${tableName} = new Table(${columnsPart}, ${optionsPart});`;
    }
  );
  console.log(`✅ Index patching complete. Tables patched: ${patchedCount}`);
  return result;
}

function buildCombinedSchema(generatedContent) {
  const indexes = loadIndexConfig();
  const indexedGenerated = patchIndexesIntoGenerated(generatedContent, indexes);

  const { entries } = extractSyncedTablesMap(indexedGenerated);

  const rewritten = indexedGenerated.replace(
    /export const AppSchema = new Schema\([\s\S]*?\);/,
    match =>
      match.replace('export const AppSchema', 'export const SyncedSchema')
  );

  const footer = `
// Import local-only tables map
import { localTables as __localTables } from './LocalSchema';

// Build combined AppSchema by merging synced tables with local-only tables
export const AppSchema = new Schema({
  // Synced tables
${entries ? entries + ',' : ''}
  // Local-only tables
  ...__localTables
});
`;

  return `${rewritten}\n${footer}`;
}

function main() {
  console.log('🔧 Combining synced schema and local-only tables...');

  const generatedContent = readFileOrExit(GENERATED_SCHEMA_FILE);
  readFileOrExit(LOCAL_SCHEMA_FILE);

  const combined = buildCombinedSchema(generatedContent);

  const outDir = path.dirname(OUTPUT_APP_SCHEMA_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(OUTPUT_APP_SCHEMA_FILE, combined);
  console.log(`✅ Combined schema written to ${OUTPUT_APP_SCHEMA_FILE}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
