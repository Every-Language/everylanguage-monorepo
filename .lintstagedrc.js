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
  'apps/**/*.{ts,tsx,js,jsx}': (filenames) => {
    // Group files by workspace and lint only changed files
    const workspaceFiles = new Map();
    filenames.forEach((file) => {
      const match = file.match(/^apps\/([^/]+)\//);
      if (match) {
        const workspace = match[1];
        if (!workspaceFiles.has(workspace)) {
          workspaceFiles.set(workspace, []);
        }
        // Store relative path from workspace root
        const relativePath = file.replace(`apps/${workspace}/`, '');
        workspaceFiles.get(workspace).push(relativePath);
      }
    });
    const commands = [`prettier --write ${filenames.join(' ')}`];
    workspaceFiles.forEach((files, workspace) => {
      // Run eslint from workspace directory on changed files only
      const fileList = files.map((f) => `"${f}"`).join(' ');
      commands.push(`cd apps/${workspace} && eslint --fix ${fileList}`);
    });
    return commands;
  },
  'packages/shared-ui/**/*.{ts,tsx}': (filenames) => {
    // Get relative paths from shared-ui root
    const relativePaths = filenames.map((f) => f.replace('packages/shared-ui/', '')).map((f) => `"${f}"`).join(' ');
    return [
      `prettier --write ${filenames.join(' ')}`,
      `cd packages/shared-ui && eslint --fix ${relativePaths}`,
    ];
  },
  '*.{json,md,yml,yaml}': (filenames) => [`prettier --write ${filenames.join(' ')}`],
  'packages/shared-types/types/database.{ts,d.ts,js}': [],
  'assets/**/*': [],
};

