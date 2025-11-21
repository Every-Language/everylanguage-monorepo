#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Test script for sync functions
 * Tests both JP and GRN sync functions locally
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const JOSHUA_PROJECT_API_KEY =
  Deno.env.get('JOSHUA_PROJECT_API_KEY') || 'df55560938a7';

async function testJPSync() {
  console.log('Testing JP sync function...');
  console.log(
    'This may take a while as it fetches all languages from JP API...\n'
  );

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/sync-jp-languages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'x-joshua-project-api-key': JOSHUA_PROJECT_API_KEY,
        },
      }
    );

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { raw: text };
    }

    if (!response.ok) {
      console.error('JP Sync failed:', result);
      return false;
    }

    console.log('JP Sync Result:', JSON.stringify(result, null, 2));
    return true;
  } catch (error) {
    console.error('JP Sync Error:', error);
    return false;
  }
}

async function testGRNSync() {
  console.log('\nTesting GRN sync function...');
  console.log(
    'This may take a while as it fetches all languages from GRN API...\n'
  );

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/sync-grn-languages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { raw: text };
    }

    if (!response.ok) {
      console.error('GRN Sync failed:', result);
      return false;
    }

    console.log('GRN Sync Result:', JSON.stringify(result, null, 2));
    return true;
  } catch (error) {
    console.error('GRN Sync Error:', error);
    return false;
  }
}

async function verifyData() {
  console.log('\nVerifying cached data...\n');

  try {
    // Check JP cache
    const jpResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/jp_language_cache?select=iso639_3,language_name,status,country_code,jp_scale,least_reached,percent_evangelical&limit=5`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (jpResponse.ok) {
      const jpData = await jpResponse.json();
      console.log('JP Cache Sample (first 5 rows):');
      console.log(JSON.stringify(jpData, null, 2));
    } else {
      console.error('Failed to fetch JP cache:', await jpResponse.text());
    }

    // Check GRN cache
    const grnResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/grn_language_cache?select=grn_language_id,iso639_3,language_name,ietf,audio_sample,has_recordings,program_count&limit=5`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (grnResponse.ok) {
      const grnData = await grnResponse.json();
      console.log('\nGRN Cache Sample (first 5 rows):');
      console.log(JSON.stringify(grnData, null, 2));
    } else {
      console.error('Failed to fetch GRN cache:', await grnResponse.text());
    }
  } catch (error) {
    console.error('Verification Error:', error);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Testing Sync Functions');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`JP API Key: ${JOSHUA_PROJECT_API_KEY.substring(0, 4)}...`);
  console.log('='.repeat(60));
  console.log();

  // Note: Functions need to be served first
  console.log('NOTE: Make sure Supabase functions are running!');
  console.log('Run: supabase functions serve\n');

  const jpSuccess = await testJPSync();
  const grnSuccess = await testGRNSync();

  if (jpSuccess && grnSuccess) {
    await verifyData();
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Summary:');
  console.log(`JP Sync: ${jpSuccess ? 'PASSED' : 'FAILED'}`);
  console.log(`GRN Sync: ${grnSuccess ? 'PASSED' : 'FAILED'}`);
  console.log('='.repeat(60));
}

if (import.meta.main) {
  main().catch(console.error);
}
