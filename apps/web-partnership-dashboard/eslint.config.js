import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';

export default tseslint.config([
  globalIgnores(['.next', 'dist', 'node_modules', 'next-env.d.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      // Allow 'any' for Supabase type workarounds
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow unused variables prefixed with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Next.js specific - allow metadata and revalidate exports
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: [
            'metadata',
            'viewport',
            'generateStaticParams',
            'generateMetadata',
            'generateViewport',
            'dynamic',
            'revalidate',
          ],
        },
      ],
    },
  },
]);
