#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SYNC_RULES_FILE = 'powersync/sync-rules.yaml';
const GENERATED_SCHEMA_FILE = 'powersync/AppSchema.generated.ts';

function normalizeSchema(content) {
  return content.replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trim();
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
      const match = line.match(
        /^POWERSYNC_(PROJECT_ID|AUTH_TOKEN|ORG_ID|INSTANCE_ID)=(.*)$/
      );
      if (match) {
        const key = match[1];
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    });
  }

  // 5. Check for environment-specific vars
  const prefix = isProduction ? 'PROD' : 'DEV';
  const projectId =
    envVars[`${prefix}_PROJECT_ID`] ||
    envVars.PROJECT_ID ||
    process.env[`POWERSYNC_${prefix}_PROJECT_ID`] ||
    process.env.POWERSYNC_PROJECT_ID;
  const authToken =
    envVars[`${prefix}_AUTH_TOKEN`] ||
    envVars.AUTH_TOKEN ||
    process.env[`POWERSYNC_${prefix}_AUTH_TOKEN`] ||
    process.env.POWERSYNC_AUTH_TOKEN;
  const orgId =
    envVars[`${prefix}_ORG_ID`] ||
    envVars.ORG_ID ||
    process.env[`POWERSYNC_${prefix}_ORG_ID`] ||
    process.env.POWERSYNC_ORG_ID;
  const instanceId =
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
      `  2. Or in .env: POWERSYNC_PROJECT_ID, POWERSYNC_AUTH_TOKEN, POWERSYNC_ORG_ID, POWERSYNC_INSTANCE_ID\n` +
      `  3. Or environment-specific: POWERSYNC_${prefix}_PROJECT_ID, POWERSYNC_${prefix}_AUTH_TOKEN, etc.\n\n` +
      `For local development on 'develop' branch, use development instance credentials.\n` +
      `For 'main' branch, use production instance credentials.`
  );
}

function generateTempSchema() {
  console.log('🔄 Generating temporary schema from sync rules...');

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

  // Debug: Show environment variables
  console.log('🔧 PowerSync CLI environment:');
  console.log(`   PROJECT_ID: ${process.env.PROJECT_ID ? 'set' : 'not set'}`);
  console.log(`   ORG_ID: ${process.env.ORG_ID ? 'set' : 'not set'}`);
  console.log(`   AUTH_TOKEN: ${process.env.AUTH_TOKEN ? 'set' : 'not set'}`);
  console.log(`   INSTANCE_ID: ${process.env.INSTANCE_ID ? 'set' : 'not set'}`);

  const output = execSync(
    `npx powersync instance sync-rules generate-schema -f "${SYNC_RULES_FILE}" -l js`,
    { encoding: 'utf8', env: process.env }
  );

  // Modify imports to RN
  let schemaContent = output;
  schemaContent = schemaContent.replace(
    "import { column, Schema, Table } from '@powersync/web';",
    "import { column, Schema, Table } from '@powersync/react-native';"
  );
  schemaContent = schemaContent.replace(
    "// OR: import { column, Schema, Table } from '@powersync/react-native';",
    "// Alternative: import { column, Schema, Table } from '@powersync/web';"
  );

  const normalized = normalizeSchema(schemaContent);
  return normalized;
}

function verifySchema() {
  console.log('🔍 Verifying generated schema is in sync with sync rules...');

  try {
    if (!fs.existsSync(GENERATED_SCHEMA_FILE)) {
      console.error(
        `❌ Generated schema file not found: ${GENERATED_SCHEMA_FILE}`
      );
      console.error('💡 Run: npm run powersync:generate-schema');
      process.exit(1);
    }

    const committedGenerated = normalizeSchema(
      fs.readFileSync(GENERATED_SCHEMA_FILE, 'utf8')
    );
    const expectedGenerated = generateTempSchema();

    if (committedGenerated === expectedGenerated) {
      console.log('✅ Generated schema matches sync rules');
      return true;
    }

    console.error('❌ Generated schema is NOT in sync with sync rules');
    console.error(
      '💡 Run: npm run powersync:generate-schema && commit the changes'
    );

    const tempFile = path.join(os.tmpdir(), 'expected-generated-schema.ts');
    fs.writeFileSync(tempFile, expectedGenerated);
    console.error('🔍 Compare files:');
    console.error(`   Current:  ${GENERATED_SCHEMA_FILE}`);
    console.error(`   Expected: ${tempFile}`);

    process.exit(1);
  } catch (error) {
    console.error('❌ Error verifying PowerSync schema:');
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  verifySchema();
}

module.exports = { verifySchema };
