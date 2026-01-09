#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIGURATION
// ============================================================

const mode = process.argv[2] || 'pr'; // 'push' or 'pr'
const BASE_BRANCH = 'develop';

// ============================================================
// CHANGE DETECTION
// ============================================================

function detectChangedPaths() {
  try {
    const output = execSync(`git diff --name-only ${BASE_BRANCH}...HEAD`, {
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    // If branch doesn't exist or no changes, return empty
    return [];
  }
}

function detectChanges(changedPaths) {
  return {
    backend: changedPaths.some(p => p.startsWith('supabase/')),
    sharedTypes: changedPaths.some(p => p.startsWith('packages/shared-types/')),
    frontendProject: changedPaths.some(p =>
      p.startsWith('apps/web-project-dashboard/')
    ),
    frontendPartnership: changedPaths.some(p =>
      p.startsWith('apps/web-partnership-dashboard/')
    ),
    frontendAdmin: changedPaths.some(p =>
      p.startsWith('apps/web-admin-dashboard/')
    ),
    frontendAppBible: changedPaths.some(p => p.startsWith('apps/app-bible/')),
    powersyncRules: changedPaths.some(p =>
      p.includes('powersync/sync-rules.yaml')
    ),
  };
}

// ============================================================
// ERROR COLLECTION
// ============================================================

const errors = [];

async function runStep(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
    errors.push({ step: name, error });
    return { success: false, error };
  }
}

// ============================================================
// ENVIRONMENT SETUP
// ============================================================

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) {
      return;
    }

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  });

  return env;
}

function loadPowerSyncEnv() {
  const secretsDir = path.join(__dirname, '../secrets');
  const sharedPath = path.join(secretsDir, '.env.shared');
  const devPath = path.join(secretsDir, '.env.development');

  const sharedEnv = parseEnvFile(sharedPath);
  const devEnv = parseEnvFile(devPath);

  // Merge shared and development env vars
  const env = { ...sharedEnv, ...devEnv };

  // Map to PowerSync CLI format
  if (env.POWERSYNC_API_TOKEN) {
    process.env.AUTH_TOKEN = env.POWERSYNC_API_TOKEN;
  }
  if (env.POWERSYNC_ORG_ID) {
    process.env.ORG_ID = env.POWERSYNC_ORG_ID;
  }
  if (env.POWERSYNC_PROJECT_ID) {
    process.env.PROJECT_ID = env.POWERSYNC_PROJECT_ID;
  }
  if (env.POWERSYNC_INSTANCE_ID) {
    process.env.INSTANCE_ID = env.POWERSYNC_INSTANCE_ID;
  }

  // Check if all required vars are present
  const required = ['AUTH_TOKEN', 'ORG_ID', 'PROJECT_ID', 'INSTANCE_ID'];
  const missing = required.filter(key => !process.env[key]);

  return missing.length === 0;
}

// ============================================================
// SUPABASE HELPERS
// ============================================================

function waitForSupabase(timeout = 60) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (Date.now() - startTime > timeout * 1000) {
        clearInterval(checkInterval);
        reject(new Error('Timeout waiting for Supabase to start'));
        return;
      }

      try {
        execSync('curl -f http://127.0.0.1:54321/rest/v1/ >/dev/null 2>&1', {
          stdio: 'ignore',
        });
        clearInterval(checkInterval);
        resolve(true);
      } catch {
        // Continue waiting
      }
    }, 2000);
  });
}

// ============================================================
// CHECK FUNCTIONS
// ============================================================

async function runFormatCheck() {
  return runStep('Format check', () => {
    execSync('pnpm run format:check', { stdio: 'inherit' });
  });
}

async function runLint(changes) {
  const filters = [];

  if (changes.backend || changes.sharedTypes) {
    filters.push('--filter=backend');
  }
  if (changes.frontendProject) {
    filters.push('--filter=web-project-dashboard');
  }
  if (changes.frontendPartnership) {
    filters.push('--filter=web-partnership-dashboard');
  }
  if (changes.frontendAdmin) {
    filters.push('--filter=web-admin-dashboard');
  }
  if (changes.frontendAppBible) {
    filters.push('--filter=el-bible');
  }

  if (filters.length === 0) {
    // No changes detected, run all
    return runStep('Lint', () => {
      execSync('turbo run lint', { stdio: 'inherit' });
    });
  }

  return runStep('Lint', () => {
    execSync(`turbo run lint ${filters.join(' ')}`, { stdio: 'inherit' });
  });
}

async function runTypeCheck(changes) {
  const filters = [];

  if (changes.backend || changes.sharedTypes) {
    filters.push('--filter=backend');
  }
  if (changes.frontendProject) {
    filters.push('--filter=web-project-dashboard');
  }
  if (changes.frontendPartnership) {
    filters.push('--filter=web-partnership-dashboard');
  }
  if (changes.frontendAdmin) {
    filters.push('--filter=web-admin-dashboard');
  }
  if (changes.frontendAppBible) {
    filters.push('--filter=el-bible');
  }

  if (filters.length === 0) {
    return runStep('Type check', () => {
      execSync('turbo run type-check', { stdio: 'inherit' });
    });
  }

  return runStep('Type check', () => {
    execSync(`turbo run type-check ${filters.join(' ')}`, { stdio: 'inherit' });
  });
}

async function runBackendChecks(changes) {
  if (!changes.backend && !changes.sharedTypes) {
    console.log('⏭️  Skipping backend checks (no backend changes detected)');
    return;
  }

  // Deno type-check for Edge Functions (only if Deno is installed)
  try {
    execSync('which deno', { stdio: 'ignore' });
    await runStep('Backend: Deno type-check', () => {
      execSync('cd supabase && pnpm run type-check:functions', {
        stdio: 'inherit',
      });
    });
  } catch (error) {
    console.log('⏭️  Skipping Deno type-check (Deno not installed)');
  }

  // Start Supabase
  await runStep('Backend: Start Supabase', async () => {
    execSync('cd supabase && supabase start', { stdio: 'inherit' });
    await waitForSupabase();
  });

  // Run backend tests
  await runStep('Backend: Tests', () => {
    execSync('cd supabase && pnpm run test', {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        SUPABASE_URL: 'http://127.0.0.1:54321',
      },
    });
  });

  // Stop Supabase (always, even on error)
  try {
    execSync('cd supabase && supabase stop', { stdio: 'inherit' });
  } catch (error) {
    console.warn('⚠️  Failed to stop Supabase:', error.message);
  }
}

async function runTests(changes, mode) {
  const filters = [];

  if (changes.backend || changes.sharedTypes) {
    filters.push('--filter=backend');
  }
  if (changes.frontendProject) {
    filters.push('--filter=web-project-dashboard');
  }
  if (changes.frontendPartnership) {
    filters.push('--filter=web-partnership-dashboard');
  }
  if (changes.frontendAdmin) {
    filters.push('--filter=web-admin-dashboard');
  }
  if (changes.frontendAppBible) {
    filters.push('--filter=el-bible');
  }

  if (filters.length === 0) {
    // No changes detected, run all
    const testCommand =
      mode === 'pr' ? 'turbo run test:coverage' : 'turbo run test:run';

    return runStep(
      `Tests (${mode === 'pr' ? 'with coverage' : 'light'})`,
      () => {
        execSync(testCommand, { stdio: 'inherit' });
      }
    );
  }

  // Special handling for app-bible in PR mode
  if (changes.frontendAppBible && mode === 'pr') {
    const appBibleIndex = filters.indexOf('--filter=el-bible');
    if (appBibleIndex !== -1) {
      filters.splice(appBibleIndex, 1);

      // Run other frontend tests with coverage
      if (filters.length > 0) {
        await runStep('Tests (with coverage)', () => {
          execSync(`turbo run test:coverage ${filters.join(' ')}`, {
            stdio: 'inherit',
          });
        });
      }

      // Run app-bible with test:ci
      return runStep('Tests: App Bible (CI mode)', () => {
        execSync('cd apps/app-bible && pnpm run test:ci', { stdio: 'inherit' });
      });
    }
  }

  const testCommand =
    mode === 'pr'
      ? `turbo run test:coverage ${filters.join(' ')}`
      : `turbo run test:run ${filters.join(' ')}`;

  return runStep(`Tests (${mode === 'pr' ? 'with coverage' : 'light'})`, () => {
    execSync(testCommand, { stdio: 'inherit' });
  });
}

async function runBuild(changes, mode) {
  if (mode !== 'pr') {
    console.log('⏭️  Skipping build (push mode - build only runs on PRs)');
    return;
  }

  const filters = [];

  if (changes.backend || changes.sharedTypes) {
    filters.push('--filter=backend');
  }
  if (changes.frontendProject) {
    filters.push('--filter=web-project-dashboard');
  }
  if (changes.frontendPartnership) {
    filters.push('--filter=web-partnership-dashboard');
  }
  if (changes.frontendAdmin) {
    filters.push('--filter=web-admin-dashboard');
  }
  if (changes.frontendAppBible) {
    filters.push('--filter=el-bible');
  }

  if (filters.length === 0) {
    return runStep('Build', () => {
      execSync('turbo run build', {
        stdio: 'inherit',
        env: {
          ...process.env,
          VITE_SUPABASE_URL: 'https://dummy.supabase.co',
          VITE_SUPABASE_ANON_KEY: 'dummy_key',
        },
      });
    });
  }

  return runStep('Build', () => {
    execSync(`turbo run build ${filters.join(' ')}`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_SUPABASE_URL: 'https://dummy.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'dummy_key',
      },
    });
  });
}

async function runSecurityAudit(mode) {
  if (mode !== 'pr') {
    console.log(
      '⏭️  Skipping security audit (push mode - audit only runs on PRs)'
    );
    return;
  }

  return runStep('Security audit', () => {
    execSync('pnpm audit --audit-level high', { stdio: 'inherit' });
  });
}

async function runAppBibleValidation(changes) {
  // Skip this check locally - native folders are expected for development builds
  // CI will catch if native folders are committed to the repo
  if (!changes.frontendAppBible) {
    return;
  }

  console.log(
    '⏭️  Skipping App Bible native folder check (expected locally for dev builds)'
  );
}

async function runPowerSyncValidation(changes, mode) {
  if (mode !== 'pr' || !changes.powersyncRules) {
    return;
  }

  // Load PowerSync env vars
  const envLoaded = loadPowerSyncEnv();
  if (!envLoaded) {
    console.warn('⚠️  PowerSync env vars not found - skipping validation');
    return;
  }

  // Validate syntax
  await runStep('PowerSync: Validate sync rules syntax', () => {
    execSync(
      'python3 -c "import yaml; yaml.safe_load(open(\'apps/app-bible/powersync/sync-rules.yaml\'))"',
      { stdio: 'inherit' }
    );
  });

  // Verify schema (requires API access)
  return runStep('PowerSync: Verify schema', () => {
    execSync('cd apps/app-bible && pnpm run powersync:verify-schema', {
      stdio: 'inherit',
      env: {
        ...process.env,
        AUTH_TOKEN: process.env.AUTH_TOKEN,
        ORG_ID: process.env.ORG_ID,
        PROJECT_ID: process.env.PROJECT_ID,
        INSTANCE_ID: process.env.INSTANCE_ID,
      },
    });
  });
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  console.log(`\n🚀 Running CI checks (${mode} mode)\n`);

  const changedPaths = detectChangedPaths();
  const changes = detectChanges(changedPaths);

  if (changedPaths.length > 0) {
    console.log('📋 Changed files detected:');
    changedPaths.forEach(filePath => console.log(`   ${filePath}`));
    console.log('');
  }

  // Run all checks (collect errors)
  await runFormatCheck();
  await runLint(changes);
  await runTypeCheck(changes);
  await runBackendChecks(changes);
  await runTests(changes, mode);
  await runBuild(changes, mode);
  // Skip App Bible validation - native folders expected locally for dev builds
  // CI will catch if native folders are committed
  await runPowerSyncValidation(changes, mode);
  await runSecurityAudit(mode);

  // Report summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (errors.length === 0) {
    console.log('✅ All CI checks passed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);
  } else {
    console.log(`❌ CI Checks Failed (${errors.length} error(s))`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    errors.forEach(({ step, error }) => {
      console.log(`❌ ${step}`);
      console.log(`   ${error.message}\n`);
    });

    console.log(`Total: ${errors.length} error(s)`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
