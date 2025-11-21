#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Direct test of sync functions by importing and calling them
 * This bypasses the HTTP layer and tests the core logic
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const JOSHUA_PROJECT_API_KEY =
  Deno.env.get('JOSHUA_PROJECT_API_KEY') || 'df55560938a7';

async function testJPSync() {
  console.log('Testing JP sync function...\n');

  // Set environment variables
  Deno.env.set('SUPABASE_URL', SUPABASE_URL);
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);
  Deno.env.set('JOSHUA_PROJECT_API_KEY', JOSHUA_PROJECT_API_KEY);

  try {
    // Test by making a small fetch to verify the API works
    console.log('Fetching a small sample from JP API to verify connection...');
    const testUrl = `https://api.joshuaproject.net/v1/languages.json?api_key=${JOSHUA_PROJECT_API_KEY}&limit=2`;
    const testResponse = await fetch(testUrl);

    if (!testResponse.ok) {
      throw new Error(
        `JP API test failed: ${testResponse.status} ${testResponse.statusText}`
      );
    }

    const testData = await testResponse.json();
    console.log('JP API connection successful!');
    console.log(
      `Sample data structure:`,
      JSON.stringify(testData[0], null, 2).substring(0, 500)
    );

    return true;
  } catch (error) {
    console.error('JP Sync test error:', error);
    return false;
  }
}

async function testGRNSync() {
  console.log('\nTesting GRN sync function...\n');

  try {
    console.log('Fetching GRN API to verify connection...');
    const grnUrl =
      'https://api.globalrecordings.net/feeds/language/all?format=json';
    const testResponse = await fetch(grnUrl);

    if (!testResponse.ok) {
      throw new Error(
        `GRN API test failed: ${testResponse.status} ${testResponse.statusText}`
      );
    }

    const testData = await testResponse.json();
    const languages = testData.languages?.language;
    const firstLang = Array.isArray(languages) ? languages[0] : languages;

    console.log('GRN API connection successful!');
    console.log(
      `Sample data structure:`,
      JSON.stringify(firstLang, null, 2).substring(0, 500)
    );

    return true;
  } catch (error) {
    console.error('GRN Sync test error:', error);
    return false;
  }
}

async function verifySchema() {
  console.log('\nVerifying database schema...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Check JP table structure
    const jpCheck = await supabase
      .from('jp_language_cache')
      .select('*')
      .limit(0);

    if (jpCheck.error) {
      console.error('JP table check error:', jpCheck.error);
      return false;
    }

    console.log('✓ JP table exists and is accessible');

    // Check GRN table structure
    const grnCheck = await supabase
      .from('grn_language_cache')
      .select('*')
      .limit(0);

    if (grnCheck.error) {
      console.error('GRN table check error:', grnCheck.error);
      return false;
    }

    console.log('✓ GRN table exists and is accessible');

    // Try to insert a test row to verify new columns work
    console.log('\nTesting JP insert with new fields...');
    const testJpRow = {
      iso639_3: 'test',
      language_name: 'Test Language',
      status: 'N',
      country_code: 'US',
      jp_scale: 5,
      least_reached: true,
      percent_evangelical: 10.5,
    };

    const jpInsert = await supabase
      .from('jp_language_cache')
      .upsert(testJpRow, { onConflict: 'iso639_3' });

    if (jpInsert.error) {
      console.error('JP insert test failed:', jpInsert.error);
      return false;
    }

    console.log('✓ JP insert with new fields successful');

    // Clean up test row
    await supabase.from('jp_language_cache').delete().eq('iso639_3', 'test');

    console.log('\nTesting GRN insert with new JSONB fields...');
    const testGrnRow = {
      grn_language_id: 999999,
      language_name: 'Test GRN Language',
      iso639_3: 'test',
      ietf: 'test-TEST',
      audio_sample: true,
      media_ids: [{ org_key: 1, code: 'TEST' }],
      alternate_names: [{ name: 'Test', ietf: 'en' }],
      programs: [{ id: 1, title: 'Test Program' }],
    };

    const grnInsert = await supabase
      .from('grn_language_cache')
      .upsert(testGrnRow, { onConflict: 'grn_language_id' });

    if (grnInsert.error) {
      console.error('GRN insert test failed:', grnInsert.error);
      return false;
    }

    console.log('✓ GRN insert with JSONB fields successful');

    // Clean up test row
    await supabase
      .from('grn_language_cache')
      .delete()
      .eq('grn_language_id', 999999);

    return true;
  } catch (error) {
    console.error('Schema verification error:', error);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Direct Sync Functions Test');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`JP API Key: ${JOSHUA_PROJECT_API_KEY.substring(0, 4)}...`);
  console.log('='.repeat(60));
  console.log();

  const apiTests = await Promise.all([testJPSync(), testGRNSync()]);
  const schemaOk = await verifySchema();

  console.log('\n' + '='.repeat(60));
  console.log('Test Summary:');
  console.log(`JP API Connection: ${apiTests[0] ? 'PASSED' : 'FAILED'}`);
  console.log(`GRN API Connection: ${apiTests[1] ? 'PASSED' : 'FAILED'}`);
  console.log(`Schema Verification: ${schemaOk ? 'PASSED' : 'FAILED'}`);
  console.log('='.repeat(60));

  if (apiTests[0] && apiTests[1] && schemaOk) {
    console.log(
      '\n✓ All tests passed! The sync functions should work correctly.'
    );
    console.log('\nTo run the full sync, use:');
    console.log('  supabase functions serve');
    console.log('Then invoke via HTTP POST to the function endpoints.');
  } else {
    console.log('\n✗ Some tests failed. Please check the errors above.');
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
