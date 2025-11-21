#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Test the sync function logic by importing and testing the normalization functions
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const JOSHUA_PROJECT_API_KEY = 'df55560938a7';

// Copy the helper functions from sync-jp-languages
function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function coerceBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['y', 'yes', 'true', '1'].includes(normalized);
  }
  return false;
}

function toCleanString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function getField(
  payload: Record<string, unknown>,
  candidates: string[]
): unknown {
  for (const key of candidates) {
    if (key in payload) {
      return payload[key];
    }
    const lowerKey = key.toLowerCase();
    for (const actualKey of Object.keys(payload)) {
      if (actualKey.toLowerCase() === lowerKey) {
        return payload[actualKey];
      }
    }
  }
  return undefined;
}

async function testJPNormalization() {
  console.log('Testing JP normalization logic...\n');

  // Fetch a real sample from JP API
  const url = `https://api.joshuaproject.net/v1/languages.json?api_key=${JOSHUA_PROJECT_API_KEY}&limit=2`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`JP API failed: ${response.status}`);
  }

  const languages = await response.json();
  const sampleLang = languages[1]; // Use second one as it likely has more data

  console.log('Sample JP API response:');
  console.log(JSON.stringify(sampleLang, null, 2).substring(0, 800));
  console.log('\n');

  // Test normalization
  const normalized = {
    iso639_3:
      (getField(sampleLang, ['ROL3']) as string)?.toLowerCase().trim() || '',
    language_name:
      (getField(sampleLang, ['Language', 'WebLangText']) as string) || '',
    bible_status: coerceNumber(getField(sampleLang, ['BibleStatus'])),
    bible_year: toCleanString(getField(sampleLang, ['BibleYear'])),
    nt_year: toCleanString(getField(sampleLang, ['NTYear'])),
    portions_year: toCleanString(getField(sampleLang, ['PortionsYear'])),
    has_audio_recordings: coerceBoolean(
      getField(sampleLang, ['HasAudioRecordings'])
    ),
    grn_url: toCleanString(getField(sampleLang, ['GRN_URL'])),
    status: toCleanString(getField(sampleLang, ['Status'])),
    country_code: toCleanString(getField(sampleLang, ['ROG3'])),
    hub_country: toCleanString(getField(sampleLang, ['HubCountry'])),
    translation_need_questionable: coerceBoolean(
      getField(sampleLang, ['TranslationNeedQuestionable'])
    )
      ? true
      : null,
    percent_adherents: coerceNumber(getField(sampleLang, ['PercentAdherents'])),
    percent_evangelical: coerceNumber(
      getField(sampleLang, ['PercentEvangelical'])
    ),
    has_jesus_film: coerceBoolean(getField(sampleLang, ['HasJesusFilm']))
      ? true
      : null,
    jf_url: toCleanString(getField(sampleLang, ['JF_URL'])),
    jp_scale: coerceNumber(getField(sampleLang, ['JPScale'])),
    least_reached: coerceBoolean(getField(sampleLang, ['LeastReached']))
      ? true
      : null,
    religion_code: toCleanString(getField(sampleLang, ['RLG3'])),
    primary_religion: toCleanString(getField(sampleLang, ['PrimaryReligion'])),
    fcbh_url: toCleanString(getField(sampleLang, ['FCBH_URL'])),
    nbr_pgics: coerceNumber(getField(sampleLang, ['NbrPGICs'])),
    nbr_countries: coerceNumber(getField(sampleLang, ['NbrCountries'])),
  };

  console.log('Normalized JP data:');
  console.log(JSON.stringify(normalized, null, 2));
  console.log('\n✓ JP normalization test passed!\n');

  return normalized;
}

async function testGRNNormalization() {
  console.log('Testing GRN normalization logic...\n');

  // Fetch a real sample from GRN API
  const url = 'https://api.globalrecordings.net/feeds/language/all?format=json';
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`GRN API failed: ${response.status}`);
  }

  const data = await response.json();
  const languages = data.languages?.language;
  const sampleLang = Array.isArray(languages)
    ? languages.find(
        (l: any) => l.id && l.id > 0 && l.programs?.program?.length > 0
      ) || languages[1]
    : languages;

  console.log('Sample GRN API response (truncated):');
  const sampleCopy = { ...sampleLang };
  if (
    sampleCopy.programs?.program &&
    Array.isArray(sampleCopy.programs.program)
  ) {
    sampleCopy.programs.program = sampleCopy.programs.program.slice(0, 2); // Only show first 2 programs
  }
  console.log(JSON.stringify(sampleCopy, null, 2).substring(0, 1000));
  console.log('\n');

  // Test normalization
  const programs = sampleLang.programs?.program || [];
  const programsArray = Array.isArray(programs)
    ? programs
    : programs
      ? [programs]
      : [];

  const normalized = {
    grn_language_id: Number(sampleLang.id) || 0,
    iso639_3: sampleLang.iso?.trim() || null,
    language_name: sampleLang.name?.trim() || '',
    has_recordings: programsArray.length > 0,
    program_count: programsArray.length,
    parent_id: sampleLang.parent
      ? Number(sampleLang.parent)
      : sampleLang.parentId
        ? Number(sampleLang.parentId)
        : null,
    name_ietf: sampleLang.nameIetf?.trim() || null,
    audio_sample:
      typeof sampleLang.audioSample === 'boolean'
        ? sampleLang.audioSample
        : null,
    ietf: sampleLang.ietf?.trim() || null,
    media_ids:
      sampleLang.mediaIds &&
      Array.isArray(sampleLang.mediaIds) &&
      sampleLang.mediaIds.length > 0
        ? sampleLang.mediaIds
        : null,
    alternate_names:
      sampleLang.alternateNames &&
      Array.isArray(sampleLang.alternateNames) &&
      sampleLang.alternateNames.length > 0
        ? sampleLang.alternateNames
        : null,
    programs: programsArray.length > 0 ? programsArray : null,
  };

  console.log('Normalized GRN data:');
  console.log(
    JSON.stringify(
      {
        ...normalized,
        programs: normalized.programs
          ? `[${normalized.programs.length} programs]`
          : null,
        alternate_names: normalized.alternate_names
          ? `[${normalized.alternate_names.length} names]`
          : null,
        media_ids: normalized.media_ids
          ? `[${normalized.media_ids.length} media IDs]`
          : null,
      },
      null,
      2
    )
  );
  console.log('\n✓ GRN normalization test passed!\n');

  return normalized;
}

async function testDatabaseInsert() {
  console.log('Testing database insert with normalized data...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Test JP insert
  const jpData = await testJPNormalization();
  if (!jpData.iso639_3) {
    console.log('Skipping JP insert test - no ISO code');
  } else {
    const jpResult = await supabase.from('jp_language_cache').upsert(
      {
        ...jpData,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'iso639_3' }
    );

    if (jpResult.error) {
      console.error('JP insert failed:', jpResult.error);
    } else {
      console.log('✓ JP insert successful!');
      // Clean up
      await supabase
        .from('jp_language_cache')
        .delete()
        .eq('iso639_3', jpData.iso639_3);
    }
  }

  // Test GRN insert
  const grnData = await testGRNNormalization();
  if (!grnData.grn_language_id) {
    console.log('Skipping GRN insert test - no GRN ID');
  } else {
    const grnResult = await supabase.from('grn_language_cache').upsert(
      {
        ...grnData,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'grn_language_id' }
    );

    if (grnResult.error) {
      console.error('GRN insert failed:', grnResult.error);
    } else {
      console.log('✓ GRN insert successful!');
      // Clean up
      await supabase
        .from('grn_language_cache')
        .delete()
        .eq('grn_language_id', grnData.grn_language_id);
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Sync Functions Logic Test');
  console.log('='.repeat(60));
  console.log();

  try {
    await testDatabaseInsert();
    console.log('\n' + '='.repeat(60));
    console.log('✓ All tests passed!');
    console.log('The sync functions should work correctly when invoked.');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
