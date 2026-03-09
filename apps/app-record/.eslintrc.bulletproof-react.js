/**
 * Bulletproof React ESLint Configuration
 *
 * This file contains ESLint rules for enforcing Bulletproof React principles.
 * To use these rules, install the required plugins and merge this config into your main eslint.config.js
 *
 * Required plugins:
 *   pnpm add -D eslint-plugin-import eslint-plugin-check-file
 *
 * Then in your eslint.config.js, add:
 *   import importPlugin from 'eslint-plugin-import';
 *   import checkFilePlugin from 'eslint-plugin-check-file';
 *
 * And add to plugins and rules sections.
 */

export default {
  plugins: {
    // Note: These plugins need to be installed separately
    // 'import': importPlugin,
    // 'check-file': checkFilePlugin,
  },
  rules: {
    // Prevent cross-feature imports (unidirectional flow)
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './src/features',
            from: './src/app',
            message:
              'Features should not import from app. Compose features at the screen/app level instead.',
          },
          {
            target: './src/features/*',
            from: './src/features/*',
            except: ['./shared'],
            message:
              'Features should not import from other features. Use shared modules or composition instead.',
          },
        ],
      },
    ],

    // Enforce kebab-case file naming (except hooks which use camelCase)
    'check-file/filename-naming-convention': [
      'error',
      {
        '**/*.{ts,tsx}': 'KEBAB_CASE',
        // Allow camelCase for hooks (useHook.ts pattern)
        '**/hooks/use*.ts': 'CAMEL_CASE',
        '**/hooks/use*.tsx': 'CAMEL_CASE',
        // Allow PascalCase for index files
        '**/index.ts': 'IGNORE',
        '**/index.tsx': 'IGNORE',
      },
      {
        ignoreMiddleExtensions: true,
      },
    ],

    // Enforce kebab-case folder naming
    'check-file/folder-naming-convention': [
      'error',
      {
        'src/**/!(__tests__)': 'KEBAB_CASE',
      },
    ],
  },
};
