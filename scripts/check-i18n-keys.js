#!/usr/bin/env node

/**
 * Script to check for missing i18n translation keys
 *
 * This script:
 * 1. Scans TypeScript/TSX files for translation key usage (t() calls)
 * 2. Extracts all translation keys being used
 * 3. Checks if those keys exist in the translation JSON file
 * 4. Reports missing keys and defaultValue usage
 * 5. Exits with error code if missing keys are found
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get app name from command line argument
const appName = process.argv[2] || 'app-bible';

// App configuration mapping
// To add a new app:
// 1. Add entry here with app directory and translation file path
// 2. Add npm script in package.json: "check:i18n-{app-name}": "node scripts/check-i18n-keys.js {app-name}"
// 3. Update CI/CD in scripts/ci-local.js to call the check when that app changes
const APP_CONFIGS = {
  'app-bible': {
    dir: join(__dirname, '../apps/app-bible'),
    translationFile: 'src/shared/services/i18n/locales/en.json',
    sourceDir: 'src',
  },
};

// Validate app name
if (!APP_CONFIGS[appName]) {
  console.error(`❌ Unknown app: ${appName}`);
  console.error(`   Supported apps: ${Object.keys(APP_CONFIGS).join(', ')}`);
  process.exit(1);
}

// Configuration
const appConfig = APP_CONFIGS[appName];
const APP_DIR = appConfig.dir;
const TRANSLATION_FILE = join(APP_DIR, appConfig.translationFile);
const SOURCE_DIR = join(APP_DIR, appConfig.sourceDir);

// Translation key patterns to find
// We match t( followed by a string literal
const TRANSLATION_PATTERNS = [
  // t('key') or t("key")
  /\bt\(['"]([^'"]+)['"]/g,
  // t(`key`) - template literals (simple ones without ${})
  /\bt\(`([^`${}]+)`/g,
];

// defaultValue pattern - indicates missing keys
const DEFAULT_VALUE_PATTERN = /defaultValue\s*:/g;

/**
 * Recursively get all TypeScript/TSX files in a directory
 */
function getAllSourceFiles(dir) {
  const files = execSync(
    `find "${dir}" -type f \\( -name "*.ts" -o -name "*.tsx" \\) -not -path "*/node_modules/*" -not -path "*/.git/*"`,
    {
      encoding: 'utf-8',
    }
  )
    .trim()
    .split('\n')
    .filter(Boolean);

  return files;
}

/**
 * Extract translation keys from a file
 */
function extractTranslationKeys(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const keys = new Set();
  const defaultValueLines = [];
  let hasDefaultValue = false;

  // Extract keys using patterns
  // First, filter out import statements to avoid false positives
  const lines = content.split('\n');
  const nonImportLines = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => !line.trim().startsWith('import '))
    .map(({ line }) => line)
    .join('\n');

  for (const pattern of TRANSLATION_PATTERNS) {
    let match;
    // Reset regex lastIndex to avoid issues with global regex
    pattern.lastIndex = 0;
    while ((match = pattern.exec(nonImportLines)) !== null) {
      const key = match[1].trim();
      // Skip empty keys, template expressions, and non-translation patterns
      if (
        key &&
        !key.includes('${') &&
        !key.startsWith('@/') &&
        !key.startsWith('../') &&
        !key.startsWith('./') &&
        !key.startsWith('@') &&
        !key.includes('/') && // Skip paths
        key.length > 1 && // Skip single characters
        !key.match(/^[.*\-_/]+$/) && // Skip patterns like ".*", "---", etc.
        key.includes('.') // Translation keys typically use dot notation
      ) {
        keys.add(key);
      }
    }
  }

  // Check for defaultValue usage (indicates missing keys)
  lines.forEach((line, index) => {
    if (DEFAULT_VALUE_PATTERN.test(line)) {
      hasDefaultValue = true;
      defaultValueLines.push(index + 1);
    }
  });

  return { keys, hasDefaultValue, defaultValueLines };
}

/**
 * Load and parse translation JSON file
 */
function loadTranslations() {
  if (!existsSync(TRANSLATION_FILE)) {
    throw new Error(`Translation file not found: ${TRANSLATION_FILE}`);
  }

  const content = readFileSync(TRANSLATION_FILE, 'utf-8');
  return JSON.parse(content);
}

/**
 * Check if a key exists in the translation object (supports nested keys with dot notation)
 */
function keyExists(translations, key) {
  const parts = key.split('.');
  let current = translations;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return false;
    }
    if (!(part in current)) {
      return false;
    }
    current = current[part];
  }

  return true;
}

/**
 * Main function
 */
function main() {
  console.log(
    `🔍 Checking for missing i18n translation keys (${appName})...\n`
  );

  // Load translations
  let translations;
  try {
    translations = loadTranslations();
    console.log(`✅ Loaded translations from: ${TRANSLATION_FILE}\n`);
  } catch (error) {
    console.error(`❌ Failed to load translations: ${error}`);
    process.exit(1);
  }

  // Get all source files
  const sourceFiles = getAllSourceFiles(SOURCE_DIR);
  console.log(`📁 Scanning ${sourceFiles.length} source files...\n`);

  // Extract all translation keys
  const allKeys = new Set();
  const filesWithDefaultValue = [];

  for (const file of sourceFiles) {
    const { keys, hasDefaultValue, defaultValueLines } =
      extractTranslationKeys(file);
    keys.forEach(key => allKeys.add(key));

    if (hasDefaultValue) {
      filesWithDefaultValue.push({
        file: file.replace(process.cwd() + '/', ''),
        lines: defaultValueLines,
      });
    }
  }

  console.log(`🔑 Found ${allKeys.size} unique translation keys in code\n`);

  // Check for missing keys
  const missingKeys = [];
  for (const key of allKeys) {
    if (!keyExists(translations, key)) {
      missingKeys.push(key);
    }
  }

  // Report results
  let hasErrors = false;

  if (missingKeys.length > 0) {
    hasErrors = true;
    console.log('❌ Missing translation keys:\n');
    missingKeys.sort().forEach(key => {
      console.log(`   - ${key}`);
    });
    console.log('');
  } else {
    console.log('✅ All translation keys found in translation file\n');
  }

  if (filesWithDefaultValue.length > 0) {
    console.log('⚠️  Files using defaultValue (may indicate missing keys):\n');
    filesWithDefaultValue.forEach(({ file, lines }) => {
      console.log(`   ${file}`);
      lines.forEach(line => {
        console.log(`      Line ${line}: defaultValue usage`);
      });
    });
    console.log('');
    // Note: defaultValue usage is a warning, not an error
    // It's acceptable during development but should be removed once keys are added
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (hasErrors) {
    console.log(`❌ Found ${missingKeys.length} missing translation key(s)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 To fix:');
    console.log(
      `   1. Add missing keys to: ${TRANSLATION_FILE.replace(process.cwd() + '/', '')}`
    );
    console.log(
      '   2. Remove defaultValue parameters from t() calls once keys are added'
    );
    console.log(`   3. Re-run this check: pnpm run check:i18n-${appName}\n`);
    process.exit(1);
  } else {
    console.log('✅ All translation keys are present');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);
  }
}

main();
