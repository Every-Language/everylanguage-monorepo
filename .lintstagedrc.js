export default {
  'apps/backend/**/*.{ts,js}': (filenames) => {
    const relativePaths = filenames
      .map((file) => file.replace(/^apps\/backend\//, ''))
      .map((file) => `"${file}"`)
      .join(' ');
    return [
      `cd apps/backend && eslint --fix ${relativePaths}`,
      `prettier --write ${filenames.join(' ')}`,
    ];
  },
  'apps/backend/**/*.sql': [
    'sql-formatter --config apps/backend/.sqlformatterrc.json --fix',
  ],
  'apps/frontend/**/*.{ts,tsx,js,jsx}': ['prettier --write'],
  'packages/shared-ui/**/*.{ts,tsx}': ['prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
  'packages/shared-types/types/database.{ts,d.ts,js}': [],
  'assets/**/*': [],
};

