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

function generateTempSchema() {
  console.log('🔄 Generating temporary schema from sync rules...');

  if (!fs.existsSync(SYNC_RULES_FILE)) {
    throw new Error(`Sync rules file not found: ${SYNC_RULES_FILE}`);
  }

  // Debug: Show environment variables
  console.log('🔧 PowerSync CLI environment:');
  console.log(`   PROJECT_ID: ${process.env.PROJECT_ID ? 'set' : 'not set'}`);
  console.log(`   ORG_ID: ${process.env.ORG_ID ? 'set' : 'not set'}`);
  console.log(`   AUTH_TOKEN: ${process.env.AUTH_TOKEN ? 'set' : 'not set'}`);
  console.log(`   INSTANCE_ID: ${process.env.INSTANCE_ID ? 'set' : 'not set'}`);

  const output = execSync(
    `npx powersync instance sync-rules generate-schema -f "${SYNC_RULES_FILE}" -l js`,
    { encoding: 'utf8' }
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

