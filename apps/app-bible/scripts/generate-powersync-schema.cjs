#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SYNC_RULES_FILE = 'powersync/sync-rules.yaml';
const SCHEMA_OUTPUT_FILE = 'powersync/AppSchema.generated.ts';

function normalizeSchema(content) {
  // Normalize whitespace and line endings for comparison
  return content
    .replace(/\r\n/g, '\n') // Convert Windows line endings
    .replace(/\s+$/gm, '') // Remove trailing whitespace
    .trim();
}

function detectEnvironment() {
  // 1. Check if env vars are already set (CI/CD or manual override)
  if (
    process.env.PROJECT_ID &&
    process.env.AUTH_TOKEN &&
    process.env.ORG_ID &&
    process.env.INSTANCE_ID
  ) {
    console.log('🔧 Using PowerSync credentials from environment variables');
    return {
      PROJECT_ID: process.env.PROJECT_ID,
      AUTH_TOKEN: process.env.AUTH_TOKEN,
      ORG_ID: process.env.ORG_ID,
      INSTANCE_ID: process.env.INSTANCE_ID,
    };
  }

  // 2. Try to detect from git branch
  let gitBranch = null;
  try {
    gitBranch = execSync('git branch --show-current', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .trim()
      .toLowerCase();
  } catch (error) {
    // Not in a git repo or git command failed
  }

  // 3. Determine environment based on branch or default to dev
  const isProduction =
    gitBranch === 'main' || process.env.NODE_ENV === 'production';
  const env = isProduction ? 'production' : 'development';

  console.log(
    `🔍 Detected environment: ${env}${gitBranch ? ` (branch: ${gitBranch})` : ''}`
  );

  // 4. Try to load from .env file in app directory
  const envFile = path.join(__dirname, '..', '.env');
  let envVars = {};

  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    envContent.split('\n').forEach(line => {
      // Support both old format (POWERSYNC_PROJECT_ID) and new format (POWERSYNC_BIBLE_PROJECT_ID)
      const match = line.match(
        /^POWERSYNC_(BIBLE_)?(PROJECT_ID|AUTH_TOKEN|ORG_ID|INSTANCE_ID)=(.*)$/
      );
      if (match) {
        const key = match[2]; // PROJECT_ID, AUTH_TOKEN, etc.
        const value = match[3].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    });
  }

  // 5. Check for environment-specific vars
  // Priority: Environment-specific app vars > App-specific vars > Generic vars
  const prefix = isProduction ? 'PROD' : 'DEV';
  const projectId =
    process.env[`POWERSYNC_BIBLE_${prefix}_PROJECT_ID`] ||
    process.env.POWERSYNC_BIBLE_PROJECT_ID ||
    envVars[`${prefix}_PROJECT_ID`] ||
    envVars.PROJECT_ID ||
    process.env[`POWERSYNC_${prefix}_PROJECT_ID`] ||
    process.env.POWERSYNC_PROJECT_ID;
  const authToken =
    process.env[`POWERSYNC_${prefix}_AUTH_TOKEN`] ||
    process.env.POWERSYNC_AUTH_TOKEN ||
    envVars[`${prefix}_AUTH_TOKEN`] ||
    envVars.AUTH_TOKEN;
  const orgId =
    process.env[`POWERSYNC_${prefix}_ORG_ID`] ||
    process.env.POWERSYNC_ORG_ID ||
    envVars[`${prefix}_ORG_ID`] ||
    envVars.ORG_ID;
  const instanceId =
    process.env[`POWERSYNC_BIBLE_${prefix}_INSTANCE_ID`] ||
    process.env.POWERSYNC_BIBLE_INSTANCE_ID ||
    envVars[`${prefix}_INSTANCE_ID`] ||
    envVars.INSTANCE_ID ||
    process.env[`POWERSYNC_${prefix}_INSTANCE_ID`] ||
    process.env.POWERSYNC_INSTANCE_ID;

  if (projectId && authToken && orgId && instanceId) {
    console.log(`✅ Loaded PowerSync credentials for ${env} environment`);
    return {
      PROJECT_ID: projectId,
      AUTH_TOKEN: authToken,
      ORG_ID: orgId,
      INSTANCE_ID: instanceId,
    };
  }

  // 6. If still no credentials, show helpful error
  throw new Error(
    `❌ PowerSync credentials not found for ${env} environment.\n\n` +
      `Please set one of the following:\n` +
      `  1. Environment variables: PROJECT_ID, AUTH_TOKEN, ORG_ID, INSTANCE_ID\n` +
      `  2. Or in .env: POWERSYNC_BIBLE_PROJECT_ID, POWERSYNC_AUTH_TOKEN, POWERSYNC_ORG_ID, POWERSYNC_BIBLE_INSTANCE_ID\n` +
      `  3. Or environment-specific: POWERSYNC_BIBLE_${prefix}_PROJECT_ID, POWERSYNC_BIBLE_${prefix}_INSTANCE_ID, etc.\n` +
      `  4. Or legacy format: POWERSYNC_PROJECT_ID, POWERSYNC_INSTANCE_ID (for backward compatibility)\n\n` +
      `For local development on 'develop' branch, use development instance credentials.\n` +
      `For 'main' branch, use production instance credentials.\n\n` +
      `Note: Project IDs should be in .env.shared, instance IDs should be in .env.development or .env.production`
  );
}

function generateSchema() {
  console.log('🔄 Generating PowerSync schema from sync rules...');

  try {
    // Check if sync rules file exists
    if (!fs.existsSync(SYNC_RULES_FILE)) {
      throw new Error(`Sync rules file not found: ${SYNC_RULES_FILE}`);
    }

    // Detect and load environment credentials
    const credentials = detectEnvironment();

    // Set environment variables for PowerSync CLI
    process.env.PROJECT_ID = credentials.PROJECT_ID;
    process.env.AUTH_TOKEN = credentials.AUTH_TOKEN;
    process.env.ORG_ID = credentials.ORG_ID;
    process.env.INSTANCE_ID = credentials.INSTANCE_ID;

    // Generate schema using PowerSync CLI
    console.log('📄 Running PowerSync CLI to generate schema...');
    const output = execSync(
      `npx powersync instance sync-rules generate-schema -f "${SYNC_RULES_FILE}" -l js`,
      { encoding: 'utf8', env: process.env }
    );

    // Extract the generated schema (skip the import line and modify it)
    let schemaContent = output;

    // Replace the web import with react-native import
    schemaContent = schemaContent.replace(
      "import { column, Schema, Table } from '@powersync/web';",
      "import { column, Schema, Table } from '@powersync/react-native';"
    );

    // Also handle the alternative comment import
    schemaContent = schemaContent.replace(
      "// OR: import { column, Schema, Table } from '@powersync/react-native';",
      "// Alternative: import { column, Schema, Table } from '@powersync/web';"
    );

    // Ensure the powersync directory exists
    const schemaDir = path.dirname(SCHEMA_OUTPUT_FILE);
    if (!fs.existsSync(schemaDir)) {
      fs.mkdirSync(schemaDir, { recursive: true });
    }

    // Normalize and write the schema file
    const normalizedSchema = normalizeSchema(schemaContent);
    fs.writeFileSync(SCHEMA_OUTPUT_FILE, normalizedSchema);

    console.log(
      `✅ Synced schema generated successfully: ${SCHEMA_OUTPUT_FILE}`
    );
    console.log('');
    console.log('📋 Generated schema includes the following tables:');

    // Extract table names from the schema for summary
    const tableMatches = normalizedSchema.match(/const (\w+) = new Table/g);
    if (tableMatches) {
      tableMatches.forEach(match => {
        const tableName = match.match(/const (\w+) =/)[1];
        console.log(`  • ${tableName}`);
      });
    }

    console.log('');
    console.log('💡 You can now import this schema in your PowerSync setup:');
    console.log(
      `   import { AppSchema } from './${SCHEMA_OUTPUT_FILE.replace('.ts', '')}';`
    );
  } catch (error) {
    console.error('❌ Error generating PowerSync schema:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  generateSchema();
}

module.exports = { generateSchema };
