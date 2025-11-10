export default {
  'supabase/**/*.{ts,js}': (filenames) => {
    const relativePaths = filenames
      .map((file) => file.replace(/^supabase\//, ''))
      .map((file) => `"${file}"`)
      .join(' ');
    return [
      `cd supabase && eslint --fix ${relativePaths}`,
      `prettier --write ${filenames.join(' ')}`,
    ];
  },
  'supabase/**/*.sql': (filenames) =>
    filenames
      .filter((filename) => !filename.includes('/scripts/') && !filename.includes('/seed/'))
      .map(
        (filename) =>
          `sql-formatter --config supabase/.sqlformatterrc.json --fix ${filename}`
      ),
  'apps/**/*.{ts,tsx,js,jsx}': ['prettier --write'],
  'packages/shared-ui/**/*.{ts,tsx}': ['prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
  'packages/shared-types/types/database.{ts,d.ts,js}': [],
  'assets/**/*': [],
};

