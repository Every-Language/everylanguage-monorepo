#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { config: dotenvConfig } = require('dotenv');

const SYNC_RULES_FILE = 'powersync/sync-rules.yaml';
const SCHEMA_OUTPUT_FILE = 'powersync/AppSchema.generated.ts';

// Load .env.local file from app-record directory
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenvConfig({ path: envLocalPath });
  console.log('📁 Loaded credentials from .env.local');
} else {
  console.log('⚠️  .env.local not found, using environment variables');
}

function normalizeSchema(content) {
  // Normalize whitespace and line endings for comparison
  return content
    .replace(/\r\n/g, '\n') // Convert Windows line endings
    .replace(/\s+$/gm, '') // Remove trailing whitespace
    .trim();
}

function generateSchema() {
  console.log('🔄 Generating PowerSync schema from sync rules...');

  try {
    // Check if sync rules file exists
    if (!fs.existsSync(SYNC_RULES_FILE)) {
      throw new Error(`Sync rules file not found: ${SYNC_RULES_FILE}`);
    }

    // Map environment variables to PowerSync CLI format
    // Support both POWERSYNC_* prefix and direct variable names
    const projectId =
      process.env.POWERSYNC_PROJECT_ID || process.env.PROJECT_ID;
    const authToken =
      process.env.POWERSYNC_AUTH_TOKEN || process.env.AUTH_TOKEN;
    const orgId = process.env.POWERSYNC_ORG_ID || process.env.ORG_ID;
    const instanceId =
      process.env.POWERSYNC_INSTANCE_ID || process.env.INSTANCE_ID;

    // Validate required credentials
    if (!projectId || !authToken || !orgId) {
      throw new Error(
        'Missing PowerSync credentials. Please set in .env.local:\n' +
          '  POWERSYNC_PROJECT_ID (or PROJECT_ID)\n' +
          '  POWERSYNC_AUTH_TOKEN (or AUTH_TOKEN)\n' +
          '  POWERSYNC_ORG_ID (or ORG_ID)\n' +
          '  POWERSYNC_INSTANCE_ID (or INSTANCE_ID) - optional'
      );
    }

    // Prepare environment for PowerSync CLI
    const env = {
      ...process.env,
      PROJECT_ID: projectId,
      AUTH_TOKEN: authToken,
      ORG_ID: orgId,
    };

    if (instanceId) {
      env.INSTANCE_ID = instanceId;
    }

    console.log('📄 Running PowerSync CLI to generate schema...');
    console.log(`   PROJECT_ID: ${projectId ? 'set' : 'not set'}`);
    console.log(`   ORG_ID: ${orgId ? 'set' : 'not set'}`);
    console.log(`   AUTH_TOKEN: ${authToken ? 'set' : 'not set'}`);
    console.log(`   INSTANCE_ID: ${instanceId ? 'set' : 'not set'}`);

    const output = execSync(
      `npx powersync instance sync-rules generate-schema -f "${SYNC_RULES_FILE}" -l js`,
      { encoding: 'utf8', env }
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
